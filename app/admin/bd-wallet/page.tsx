"use client";

import { useEffect, useState } from "react";
import {
    Wallet, TrendingUp, TrendingDown, Clock, ExternalLink,
    ShieldCheck, AlertCircle, Info, ArrowUpRight, ArrowDownRight,
    Activity, Shield, PieChart, History, Globe, Network,
    Cpu, Zap, BarChart3, Database, Lock, Plus, Trash2, X, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { getToken, apiRequest } from "@/lib/api";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
    TREASURY: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    BD: "text-primary bg-primary/10 border-primary/20",
    JACKPOT: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    MARKETING: "text-blue-400 bg-blue-500/10 border-blue-500/20"
};

const COMPARISON_DATA = [
    { feature: "Ownership", bd: "System / Protocol", user: "Individual User" },
    { feature: "Manual Access", bd: "❌ PROHIBITED", user: "❌ MASKED" },
    { feature: "Smart Contract", bd: "✅ MANDATORY", user: "✅ YES" },
    { feature: "Visible to Admin", bd: "✅ FULL VIEW", user: "❌ OBFUSCATED" },
    { feature: "Editable", bd: "❌ READ-ONLY", user: "❌ READ-ONLY" }
];

export default function BDWalletDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newWallet, setNewWallet] = useState({ name: "", address: "", type: "BD" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useAdminSocket({
        onBDWalletUpdate: (data) => {
            setStats(data);
            setLastRefresh(new Date());
        }
    });

    const fetchData = async () => {
        try {
            const [statsData, historyData] = await Promise.all([
                apiRequest('/admin/bd-wallet/stats'),
                apiRequest('/admin/bd-wallet/history')
            ]);

            if (statsData.status === "success") setStats(statsData.data);
            if (historyData.status === "success") setHistory(historyData.data);
            setLastRefresh(new Date());
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = await apiRequest('/admin/bd-wallet/add', {
                method: 'POST',
                body: JSON.stringify(newWallet)
            });
            if (data.status === "success") {
                toast.success("Wallet added successfully");
                setIsAddModalOpen(false);
                setNewWallet({ name: "", address: "", type: "BD" });
                fetchData();
            } else {
                toast.error(data.message || "Failed to add wallet");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteWallet = async (id: string) => {
        if (!confirm("Are you sure you want to remove this wallet?")) return;
        try {
            const data = await apiRequest(`/admin/bd-wallet/${id}`, {
                method: 'DELETE'
            });
            if (data.status === "success") {
                toast.success("Wallet removed");
                fetchData();
            } else {
                toast.error(data.message || "Failed to remove wallet");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred");
        }
    };

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            const data = await apiRequest('/admin/bd-wallet/sync');
            if (data.status === "success") {
                toast.success("On-chain synchronization started");
                setTimeout(fetchData, 3000);
            } else {
                toast.error(data.message || "Failed to start sync");
            }
        } catch (err: any) {
            toast.error(err.message || "Sync request failed");
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // 1m polling fallback for blockchain data
        return () => clearInterval(interval);
    }, []);

    const statCards = [
        { label: "NET_CAPITAL_USDT", value: `$${stats?.totalBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}`, icon: Wallet, color: "text-primary" },
        { label: "24H_GLOBAL_INFLOW", value: `+$${stats?.dayInflow?.toLocaleString() || '0'}`, icon: TrendingUp, color: "text-emerald-400" },
        { label: "24H_GLOBAL_OUTFLOW", value: `-$${stats?.dayOutflow?.toLocaleString() || '0'}`, icon: TrendingDown, color: "text-rose-400" },
        { label: "PROTOCOL_NODES", value: stats?.wallets?.length || "0", icon: Network, color: "text-blue-400" }
    ];

    return (
        <div className="min-h-screen bg-black text-white/90 p-8 space-y-10 pb-32">
            {/* Cybernetic Header */}
            <div className="relative group overflow-hidden rounded-[40px] border border-white/5 bg-white/[0.02] p-12 transition-all duration-700">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 bg-primary/5" />
                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="uppercase tracking-[0.4em] text-[10px] font-black py-2 px-6 rounded-full border-2 border-primary/30 bg-primary/10 text-primary">
                                Mainnet_Observer_v2
                            </Badge>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">Blockchain_Sync</span>
                            </div>
                        </div>
                        <h1 className="text-6xl font-black italic tracking-tighter text-white">
                            BD WALLET <span className="text-primary tracking-normal font-normal">AUDIT_HUB</span>
                        </h1>
                        <p className="text-white/40 max-w-xl text-lg font-medium leading-relaxed">
                            Transparent, read-only system wallets for autonomous distribution. <span className="text-primary italic">Real-time balances fetched directly from BSC Mainnet.</span>
                        </p>
                        <div className="flex items-center gap-4 pt-4">
                            <Button
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-primary hover:bg-primary/80 text-black font-black italic px-8 py-6 rounded-2xl gap-3 text-lg transition-all active:scale-95"
                            >
                                <Plus className="h-5 w-5 fill-current" />
                                REGISTER_SYSTEM_NODE
                            </Button>
                            <Button
                                variant="outline"
                                onClick={fetchData}
                                className="border-white/10 hover:bg-white/5 text-white font-black italic px-6 py-6 rounded-2xl gap-3"
                            >
                                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                        {statCards.map((card, i) => (
                            <div key={i} className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2 group/card hover:border-primary/30 transition-all duration-500">
                                <div className="flex items-center justify-between">
                                    <card.icon className={cn("h-5 w-5", card.color)} />
                                    <ArrowUpRight className="h-3 w-3 text-white/20 group-hover/card:text-primary transition-colors" />
                                </div>
                                <div className="text-2xl font-black italic tracking-tighter text-white group-hover/card:scale-110 transition-transform origin-left">
                                    {card.value}
                                </div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover/card:text-primary/60 transition-colors">
                                    {card.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Wallet Grid */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-black italic tracking-tight uppercase">Active_Protocol_Wallets</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode="popLayout">
                        {stats?.wallets?.map((wallet: any) => (
                            <motion.div
                                key={wallet._id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative group/wallet p-8 rounded-[32px] bg-[#0a0a0a] border border-white/5 hover:border-primary/20 transition-all flex flex-col justify-between min-h-[220px]"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{wallet.type}</div>
                                            <div className="text-xl font-black italic text-white group-hover/wallet:text-primary transition-colors">{wallet.name}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteWallet(wallet._id)}
                                            className="p-2 rounded-xl bg-white/5 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover/wallet:opacity-100 transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs text-white/40 truncate flex-1">{wallet.address}</span>
                                        <ExternalLink
                                            className="h-3 w-3 text-white/20 cursor-pointer hover:text-primary"
                                            onClick={() => window.open(`https://bscscan.com/address/${wallet.address}`, '_blank')}
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5 mt-auto">
                                    <div className="flex items-end justify-between">
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">REAL_TIME_BALANCE</span>
                                            <div className="text-2xl font-black italic tracking-tighter text-white">
                                                {wallet.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] text-primary not-italic tracking-normal ml-1">USDT</span>
                                            </div>
                                        </div>
                                        <div className={cn("p-2 rounded-full", wallet.isActive ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                                            <div className={cn("h-2 w-2 rounded-full", wallet.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500")} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Transaction Ledger */}
                <Card className="lg:col-span-2 bg-[#0a0a0a] border-white/5 rounded-[40px] overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.01]">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black italic flex items-center gap-3">
                                <History className="h-5 w-5 text-primary" />
                                GLOBAL_TRANSACTION_LOG
                            </CardTitle>
                            <p className="text-xs text-white/40 font-medium italic">Immutable ledger records from all managed protocol nodes</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className="border-white/10 hover:bg-white/5 text-white/40 hover:text-primary gap-2 px-4 rounded-xl"
                        >
                            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{isSyncing ? "SYNCING..." : "SYNC_CHAIN"}</span>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.01]">
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-white/20 tracking-widest">Tx_Hash</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-white/20 tracking-widest">Vector</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-white/20 tracking-widest">Amount</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-white/20 tracking-widest">Module</th>
                                        <th className="px-8 py-5 text-right text-[10px] font-black uppercase text-white/20 tracking-widest">Time_Sync</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {history.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-white/10 italic font-medium">
                                                No recent on-chain events detected for the protocol network.
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((tx) => (
                                            <tr key={tx._id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-6">
                                                    <span className="font-mono text-xs text-white/60 group-hover:text-primary transition-colors hover:underline cursor-pointer">
                                                        {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className={cn(
                                                        "flex items-center gap-2 px-3 py-1 rounded-full w-fit border",
                                                        tx.type === "INFLOW" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                                    )}>
                                                        {tx.type === "INFLOW" ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{tx.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-sm font-black italic tracking-tight text-white">
                                                        {tx.type === "INFLOW" ? "+" : "-"}{tx.amount.toLocaleString()} USDT
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <Badge variant="outline" className="text-[9px] font-black px-3 py-1 bg-white/5 border-white/10 text-white/40">
                                                        {tx.module}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="text-xs font-medium text-white/20 uppercase tracking-tighter">
                                                        {format(new Date(tx.timestamp), "HH:mm:ss · MMM dd")}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Comparative Audit */}
                <Card className="bg-[#0a0a0a] border-white/5 rounded-[40px] overflow-hidden flex flex-col">
                    <CardHeader className="p-8 border-b border-white/5 bg-white/[0.01]">
                        <CardTitle className="text-xl font-black italic flex items-center gap-3 text-emerald-400">
                            <Shield className="h-5 w-5" />
                            AUDIT_CLARITY
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 flex-1 space-y-6">
                        <div className="space-y-4">
                            {COMPARISON_DATA.map((row, i) => (
                                <div key={i} className="space-y-2 pb-4 border-b border-white/5 last:border-0">
                                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{row.feature}</div>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] uppercase text-primary/40 mb-1">BD Wallets</span>
                                            <span className="text-xs font-bold text-white tracking-tight">{row.bd}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9px] uppercase text-white/20 mb-1">User Wallet</span>
                                            <span className="text-xs font-bold text-white/40 tracking-tight">{row.user}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-3 mt-auto">
                            <div className="flex items-center gap-2">
                                <Lock className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Read_Only_Enforced</span>
                            </div>
                            <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                                This interface provides strictly observer-level access. Manual fund operations (Send/Receive) are handled by protocol logic, not this dashboard.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Wallet Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(var(--primary-rgb),0.1)]"
                        >
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <Plus className="h-5 w-5 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-black italic text-white tracking-tight">REGISTER_WALLET</h2>
                                </div>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-white/20 hover:text-white">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleAddWallet} className="p-10 space-y-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">Wallet_Alias</label>
                                        <Input
                                            placeholder="e.g. Marketing Reserve_A"
                                            value={newWallet.name}
                                            onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                                            className="bg-white/5 border-white/10 h-14 rounded-2xl text-lg font-bold italic focus:border-primary transition-all"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">BSC_Address_(BEP-20)</label>
                                        <Input
                                            placeholder="0x..."
                                            value={newWallet.address}
                                            onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
                                            className="bg-white/5 border-white/10 h-14 rounded-2xl font-mono text-sm focus:border-primary transition-all"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">Asset_Module_Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['BD', 'TREASURY', 'JACKPOT', 'MARKETING'].map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setNewWallet({ ...newWallet, type })}
                                                    className={cn(
                                                        "h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                                        newWallet.type === type
                                                            ? "bg-primary border-primary text-black"
                                                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                                    )}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-primary hover:bg-primary/80 text-black h-16 rounded-[24px] font-black italic text-xl transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? "PROCESSING_NODE..." : "CONFIRM_REGISTRATION"}
                                </Button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer Metrics */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">LAST_SYNC</span>
                        <span className="text-[10px] font-bold text-white/60">{lastRefresh ? format(lastRefresh, "HH:mm:ss") : "NEVER"}</span>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">CHAIN_STATE</span>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={cn("h-1.5 w-4 rounded-full transition-all duration-1000", i <= 4 ? "bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" : "bg-white/10")} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase text-white/20 italic tracking-widest">Protocol_Engine_v2.1</span>
                    <Badge variant="outline" className="text-emerald-400 border-emerald-400/20 bg-emerald-500/5 font-black tracking-widest text-[9px]">ENCRYPTED_AUDIT</Badge>
                </div>
            </div>
        </div>
    );
}
