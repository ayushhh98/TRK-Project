"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Activity, ExternalLink, ArrowRight, ShieldCheck, RefreshCw, Filter, CheckCircle2, Clock, XCircle, Search, X, Copy, ChevronRight, Hash, User, Wallet } from "lucide-react";
import { adminAPI } from "@/lib/api";
import { GAME_CONTRACT_ADDRESS } from "@/config/contracts";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { AnimatePresence, motion } from "framer-motion";
import { useAdminSocket } from "@/hooks/useAdminSocket";

interface Transaction {
    hash: string;
    method: string;
    status: string;
    amount: string;
    symbol?: string;
    time: string;
    from?: string;
    to?: string;
}

export function BSCScanTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const DEFAULT_OFFSET = 100;
    const explorerBase = process.env.NEXT_PUBLIC_CHAIN_ID === "97"
        ? "https://testnet.bscscan.com"
        : "https://bscscan.com";

    // Real-time synchronization hooks
    const { connectionStatus } = useAdminSocket({
        onTransactionUpdate: () => {
            // Only auto-refresh if we are on the first page and not searching
            if (page === 1 && !searchTerm) {
                fetchData({ page: 1, silent: true });
            }
        }
    });

    const filteredTransactions = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return transactions;
        return transactions.filter((tx) => {
            const haystack = [
                tx.hash,
                tx.method,
                tx.status,
                tx.amount,
                tx.symbol || "",
                tx.time,
                tx.from || "",
                tx.to || ""
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [transactions, searchTerm]);

    const fetchData = async (options?: { page?: number; append?: boolean; silent?: boolean }) => {
        const targetPage = options?.page ?? 1;
        const append = options?.append ?? false;
        const silent = options?.silent ?? false;

        if (!silent) {
            if (targetPage === 1) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }
        }

        try {
            setErrorMessage(null);
            const res = await adminAPI.getContractTransactions({
                page: targetPage,
                offset: DEFAULT_OFFSET,
                sort: 'desc',
                mode: 'tokentx'
            });
            if (res.status === 'success') {
                setTransactions(prev => (append ? [...prev, ...res.data] : res.data));
                setPage(targetPage);
                const hasMoreFlag = res.pagination?.hasMore ?? (res.data?.length === DEFAULT_OFFSET);
                setHasMore(Boolean(hasMoreFlag));
                return Boolean(hasMoreFlag);
            }
        } catch (error: any) {
            console.error("Failed to fetch transactions:", error);
            setTransactions([]);
            setErrorMessage(error?.message || "Failed to fetch contract transactions.");
        } finally {
            if (!silent) {
                setIsLoading(false);
                setIsLoadingMore(false);
            }
        }
        return false;
    };

    // Autonomous Background Polling
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (page === 1 && !searchTerm) {
                fetchData({ page: 1, silent: true });
            }
        }, 15000); // Poll every 15 seconds (typical BSC block time is ~3s, 15s provides a good balance)

        return () => clearInterval(intervalId);
    }, [page, searchTerm]);

    useEffect(() => {
        fetchData({ page: 1 });
    }, []);

    const loadMore = () => {
        if (isLoadingMore || !hasMore) return;
        fetchData({ page: page + 1, append: true });
    };

    const loadAll = async () => {
        if (isLoadingMore || !hasMore) return;
        let nextPage = page + 1;
        let safety = 0;
        let more = true;
        while (more && safety < 20) {
            more = await fetchData({ page: nextPage, append: true });
            nextPage += 1;
            safety += 1;
        }
    };

    const getStatusBadge = (status: string) => {
        const isConfirmed = status === 'Confirmed';
        const isPending = status === 'Pending';

        return (
            <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest w-fit shadow-sm backdrop-blur-md",
                isConfirmed ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    isPending ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-red-500/10 text-red-500 border-red-500/20"
            )}>
                {isConfirmed ? <CheckCircle2 className="h-3 w-3" /> :
                    isPending ? <Clock className="h-3 w-3 animate-pulse" /> :
                        <XCircle className="h-3 w-3" />}
                {status}
            </div>
        );
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast notification could go here
    };

    return (
        <>
            <Card className="bg-gradient-to-br from-black/60 via-black/40 to-black/60 border border-white/10 backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)] rounded-[2.5rem]">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between p-8 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-5">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] border border-emerald-500/10">
                            <Activity className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-display font-bold text-white uppercase tracking-wider mb-1">
                                Contract Ledger
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium flex items-center gap-2">
                                    <span className={cn(
                                        "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]",
                                        connectionStatus === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                                    )} />
                                    Live Blockchain Sync
                                </p>
                                <span className="text-[9px] text-emerald-500/50 uppercase font-black bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                    Auto-Updating
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 group-focus-within:text-white/60 transition-colors" />
                            <Input
                                placeholder="SEARCH TX..."
                                className="h-9 w-40 bg-black/40 border-white/10 rounded-xl pl-9 text-[10px] font-mono focus:w-60 transition-all duration-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fetchData()}
                            disabled={isLoading}
                            className="h-9 w-9 hover:bg-white/10 text-white/60 hover:text-white transition-colors rounded-xl border border-white/5"
                        >
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-[#0f0f0f] border-b border-white/5 text-white/30 uppercase text-[9px] font-black tracking-[0.2em]">
                                <tr>
                                    <th className="px-8 py-5">Transaction Hash</th>
                                    <th className="px-8 py-5">Method</th>
                                    <th className="px-8 py-5 text-center">Value</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-8 py-5">
                                                <div className="h-8 bg-white/[0.02] rounded-xl w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : errorMessage ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-16 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                                                    <XCircle className="h-6 w-6 text-red-500" />
                                                </div>
                                                <div>
                                                    <p className="text-red-400 text-xs uppercase tracking-widest font-bold mb-1">
                                                        Sync Failure
                                                    </p>
                                                    <p className="text-[10px] text-white/30 font-mono">{errorMessage}</p>
                                                </div>
                                                <Button
                                                    onClick={() => fetchData({ page: 1 })}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-[10px] uppercase font-black tracking-widest text-white/60 hover:text-white border-white/10 hover:bg-white/5 rounded-lg"
                                                >
                                                    Retry Connection
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 rounded-full bg-white/5">
                                                    <Activity className="h-6 w-6 text-white/20" />
                                                </div>
                                                <p className="text-white/30 text-[10px] uppercase tracking-widest font-medium">
                                                    {searchTerm.trim()
                                                        ? "No matching transactions"
                                                        : "No verified transactions found"}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((tx, idx) => (
                                        <tr
                                            key={idx}
                                            onClick={() => setSelectedTx(tx)}
                                            className="hover:bg-white/[0.02] transition-all duration-200 group cursor-pointer"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-white/50 group-hover:text-emerald-400 transition-colors text-[10px] bg-white/5 px-2 py-1 rounded-lg border border-white/5 group-hover:border-emerald-500/20">
                                                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-10)}
                                                    </span>
                                                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 font-mono text-[10px] text-white/70 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-colors uppercase tracking-wider font-bold">
                                                    {tx.method}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="font-mono font-black text-white group-hover:text-emerald-400 transition-colors text-sm">
                                                    {tx.amount} <span className="text-[10px] opacity-40 font-sans font-bold">{tx.symbol || 'USDT'}</span>
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                {getStatusBadge(tx.status)}
                                            </td>
                                            <td className="px-8 py-5 text-right text-white/30 font-mono text-[10px]">
                                                {tx.time}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-5 bg-black/40 border-t border-white/5 flex items-center justify-between backdrop-blur-lg">
                        <div className="flex items-center gap-2 text-[9px] text-emerald-500/40 font-black uppercase tracking-widest px-2">
                            <ShieldCheck className="h-3 w-3" />
                            Verified via TRK Node Network
                        </div>
                        <div className="flex items-center gap-2">
                            {hasMore && (
                                <>
                                    <Button
                                        onClick={loadMore}
                                        disabled={isLoadingMore}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-[9px] uppercase font-black tracking-widest text-white/40 hover:text-white border-white/10 hover:bg-white/5 rounded-lg hover:border-emerald-500/20"
                                    >
                                        {isLoadingMore ? "Loading..." : "Load More"}
                                    </Button>
                                    <Button
                                        onClick={loadAll}
                                        disabled={isLoadingMore}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-[9px] uppercase font-black tracking-widest text-white/40 hover:text-white border-white/10 hover:bg-white/5 rounded-lg hover:border-emerald-500/20"
                                    >
                                        Load All
                                    </Button>
                                </>
                            )}
                        </div>
                        <a
                            href={`${explorerBase}/address/${GAME_CONTRACT_ADDRESS}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] uppercase font-black tracking-widest text-white/40 hover:text-emerald-400 transition-colors h-auto p-2 inline-flex items-center gap-1.5 group"
                        >
                            View Explorer <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                    </div>
                </CardContent>
            </Card>

            {/* Slide-over Drawer */}
            <AnimatePresence>
                {selectedTx && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTx(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        {/* Drawer */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0A0A0A] border-l border-white/10 z-50 p-8 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">
                                    Transaction Details
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedTx(null)}
                                    className="h-9 w-9 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6">
                                    {/* Amount */}
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <p className="text-4xl font-black text-white tracking-tight">
                                            {selectedTx.amount}
                                            <span className="text-lg font-bold text-emerald-500 ml-2">{selectedTx.symbol || 'USDT'}</span>
                                        </p>
                                        <div className="mt-3">
                                            {getStatusBadge(selectedTx.status)}
                                        </div>
                                    </div>

                                    {/* Method */}
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                                        <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Method</span>
                                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                                            {selectedTx.method}
                                        </span>
                                    </div>
                                </div>

                                {/* Addresses */}
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2 block flex items-center gap-2">
                                            <User className="h-3 w-3" /> From (Sender)
                                        </label>
                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 group-hover:border-white/10 transition-colors flex items-center justify-between gap-3">
                                            <code className="text-xs font-mono text-white/70 truncate">
                                                {selectedTx.from || 'Unknown Sender'}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => copyToClipboard(selectedTx.from || '')}
                                            >
                                                <Copy className="h-3 w-3 text-white/40" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2 block flex items-center gap-2">
                                            <Wallet className="h-3 w-3" /> To (Receiver)
                                        </label>
                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 group-hover:border-white/10 transition-colors flex items-center justify-between gap-3">
                                            <code className="text-xs font-mono text-white/70 truncate">
                                                {selectedTx.to || GAME_CONTRACT_ADDRESS}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => copyToClipboard(selectedTx.to || '')}
                                            >
                                                <Copy className="h-3 w-3 text-white/40" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Technical Details */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2 block flex items-center gap-2">
                                            <Hash className="h-3 w-3" /> Transaction Hash
                                        </label>
                                        <div className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between gap-2 overflow-hidden">
                                            <code className="text-[10px] font-mono text-white/40 truncate flex-1">
                                                {selectedTx.hash}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0"
                                                onClick={() => copyToClipboard(selectedTx.hash)}
                                            >
                                                <Copy className="h-3 w-3 text-white/40" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                                            <label className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1 block">Time</label>
                                            <p className="text-xs font-mono text-white/70">{selectedTx.time}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                                            <label className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1 block">Network</label>
                                            <p className="text-xs font-mono text-white/70">BSC {process.env.NEXT_PUBLIC_CHAIN_ID === '97' ? 'Testnet' : 'Mainnet'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5">
                                <a
                                    href={`${explorerBase}/tx/${selectedTx.hash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center w-full py-4 rounded-xl bg-white text-black font-black uppercase tracking-widest hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                                >
                                    View on Explorer <ExternalLink className="ml-2 h-4 w-4" />
                                </a>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
