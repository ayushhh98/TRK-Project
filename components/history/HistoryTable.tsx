import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWallet } from "@/components/providers/WalletProvider";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Clock, History as HistoryIcon, Hash, Zap, ChevronDown, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button"; // Matches file: button.tsx and export { Button }
import { toast } from "sonner";

export function HistoryTable() {
    const { gameHistory, isLoading, unclaimedRounds, claimWin, loadMoreHistory, hasMoreHistory, isHistoryLoading } = useWallet();

    const isClaimable = (roundId?: string) => {
        if (!roundId) return false;
        // Check if BigInt roundId exists in unclaimedRounds array
        return unclaimedRounds.some(r => r.toString() === roundId.toString());
    };

    const handleClaim = async (roundId: string) => {
        try {
            await claimWin(Number(roundId), true);
        } catch (e) {
            console.error(e);
        }
    };

    if (isLoading && gameHistory.length === 0) {
        return <div className="p-8 text-center text-white/50 animate-pulse">Loading Archives...</div>;
    }

    if (!gameHistory || gameHistory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center text-white/40">
                <HistoryIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>No extraction records found</p>
            </div>
        );
    }

    return (
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white/90">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    Extraction Log
                </CardTitle>
                <CardDescription className="text-white/40">
                    Secure immutable record of all gaming transactions
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="rounded-md border border-white/5 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-white/5 hover:bg-white/5">
                                <TableRow className="border-white/5 hover:bg-white/5">
                                    <TableHead className="text-white/40 font-mono text-xs uppercase tracking-wider">Time</TableHead>
                                    <TableHead className="text-white/40 font-mono text-xs uppercase tracking-wider">Protocol</TableHead>
                                    <TableHead className="text-white/40 font-mono text-xs uppercase tracking-wider">Prediction</TableHead>
                                    <TableHead className="text-white/40 font-mono text-xs uppercase tracking-wider text-right">Wager</TableHead>
                                    <TableHead className="text-white/40 font-mono text-xs uppercase tracking-wider text-center">Status</TableHead>
                                    <TableHead className="text-white/40 font-mono text-xs uppercase tracking-wider text-right">Result</TableHead>
                                    <TableHead className="text-white/40 font-mono text-xs uppercase tracking-wider text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gameHistory.map((item) => {
                                    const claimable = isClaimable(item.roundId);
                                    return (
                                        <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                            <TableCell className="text-white/60 font-mono text-xs">
                                                {format(new Date(item.timestamp), "yyyy-MM-dd HH:mm:ss")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] h-5 bg-white/5 hover:bg-white/10 border-white/10 text-white/60">
                                                    {(item.hash || "").startsWith("PRACTICE") ? "PRACTICE" : "REAL CHAIN"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-white/80">
                                                {item.prediction === '0' || item.prediction === 0 ? "AUTO" : item.prediction}
                                            </TableCell>
                                            <TableCell className="font-mono text-white/70 text-right">
                                                {Number(item.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${claimable
                                                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500" // Priority: Claimable
                                                        : item.won
                                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                                    }`}>
                                                    {claimable ? (
                                                        <>PENDING SYNC <Zap className="w-3 h-3 animate-pulse" /></>
                                                    ) : item.won ? (
                                                        <>WIN <CheckCircle2 className="w-3 h-3" /></>
                                                    ) : (
                                                        <>LOSS <XCircle className="w-3 h-3" /></>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className={`font-mono font-bold text-right ${claimable ? "text-amber-500" : item.won ? "text-emerald-400" : "text-white/20"}`}>
                                                {claimable ? `+${Number(item.payout).toFixed(2)}` : item.won ? `+${Number(item.payout).toFixed(2)}` : "-0.00"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {claimable && (
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-[10px] bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest"
                                                        onClick={() => handleClaim(item.roundId!)}
                                                    >
                                                        <Zap className="w-3 h-3 mr-1 fill-current" /> CLAIM
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Control */}
                    {hasMoreHistory && (
                        <div className="flex justify-center pt-2">
                            <Button
                                variant="ghost"
                                disabled={isHistoryLoading}
                                onClick={loadMoreHistory}
                                className="text-white/40 hover:text-white hover:bg-white/5 border border-white/5 rounded-full px-6"
                            >
                                {isHistoryLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading Archives...
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="mr-2 h-4 w-4" />
                                        Load Older Transactions
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
