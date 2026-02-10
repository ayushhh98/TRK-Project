"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { History, ExternalLink, ArrowDownCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DepositHistoryTable() {
    const { deposits, isLoading } = useWallet();

    if (isLoading && (!deposits || deposits.length === 0)) {
        return (
            <Card className="bg-black/40 backdrop-blur-xl border-white/5">
                <CardContent className="p-8 text-center text-white/20 uppercase tracking-[0.2em] font-black text-[10px] animate-pulse">
                    Synching Ledger...
                </CardContent>
            </Card>
        );
    }

    if (!deposits || deposits.length === 0) {
        return (
            <Card className="bg-black/40 backdrop-blur-xl border-white/5 p-12 text-center rounded-[2rem]">
                <div className="flex flex-col items-center gap-4 opacity-20">
                    <History className="h-12 w-12" />
                    <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest">No Injections Recorded</p>
                        <p className="text-[10px] uppercase tracking-widest leading-relaxed">System protocol: All incoming liquid assets will appear here.</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-black/40 backdrop-blur-xl border-white/5 rounded-[2rem] overflow-hidden group border border-emerald-500/10">
            <CardHeader className="border-b border-white/5 p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center rounded-xl">
                            <ArrowDownCircle className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-display font-black tracking-tighter uppercase italic">Injection_Logs</CardTitle>
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Capital_Sync_History</div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-16 px-8">Arrival_Time</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-16">Volume</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-16">Network_Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-16 text-right px-8">Trace_Hash</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deposits.map((item, idx) => (
                                <TableRow key={idx} className="border-white/5 hover:bg-white/[0.02] transition-colors group/row">
                                    <TableCell className="px-8 h-20">
                                        <div className="text-[10px] font-mono font-bold text-white/60">
                                            {format(new Date(item.createdAt), "yyyy.MM.dd // HH:mm:ss")}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-display font-black text-white">{item.amount.toFixed(2)}</span>
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">USDT</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                                            <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">CONFIRMED_ON_CHAIN</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        {item.txHash && !item.txHash.startsWith('mock_') ? (
                                            <a
                                                href={`https://bscscan.com/tx/${item.txHash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-[10px] font-mono font-bold text-white/20 hover:text-emerald-500 transition-colors"
                                            >
                                                {item.txHash.slice(0, 6)}...{item.txHash.slice(-4)}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold text-white/10 uppercase italic">
                                                Internal_Transfer
                                                <CheckCircle2 className="h-3 w-3" />
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
