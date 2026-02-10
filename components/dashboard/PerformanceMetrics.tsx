"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TrendingUp, Download, Share2, Users, Target, Activity, Zap, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export function PerformanceMetrics() {
    const { user, realBalances, gameHistory, totalProfit } = useWallet();
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    // ROI Calculation using totalProfit
    const totalDeposited = user?.activation?.totalDeposited || 0;
    const roi = totalDeposited > 0
        ? (totalProfit / totalDeposited) * 100
        : 0;

    // 2. Lifetime Earnings
    // Sum of all winnings + recovered cashback + commissions
    const lifetimeEarnings = (user?.totalWinnings || 0) +
        (user?.cashbackStats?.totalRecovered || 0) +
        (user?.teamStats?.totalCommission || 0);

    // 3. Network Acceleration (Active Members)
    const activeMembers = user?.teamStats?.activeMembers || 0;
    const totalMembers = user?.teamStats?.totalMembers || 0;

    // 4. Credit Estimate (Projected)
    // Simple projection: If ROI > 0, project next month based on current velocity
    const creditEstimate = realBalances.totalUnified * (1 + (roi / 100));

    // Actions
    const handleDownloadReport = () => {
        if (!gameHistory || gameHistory.length === 0) {
            toast.error("No data available for report generation.");
            return;
        }

        // Generate CSV
        const headers = ["ID", "Time", "Game", "Prediction", "Entry", "Outcome", "Payout", "Hash"];
        const rows = gameHistory.map(g => [
            g.id,
            new Date(g.timestamp).toISOString(),
            g.gameType,
            g.prediction,
            g.amount,
            g.won ? "WIN" : "LOSS",
            g.payout,
            g.hash
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `TRK_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Performance Report Downloaded");
    };

    const referralLink = user?.walletAddress
        ? `https://trk.game/ref/${user.referralCode || user.walletAddress.slice(2, 8)}`
        : "";

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast.success("Referral Uplink Copied");
    };

    return (
        <div className="space-y-6 mb-8">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    Performance Command Center
                </h3>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                        onClick={handleDownloadReport}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                    </Button>
                    <Button
                        size="sm"
                        className="bg-emerald-500 text-black hover:bg-emerald-400 font-bold"
                        onClick={() => setIsInviteOpen(true)}
                    >
                        <Share2 className="h-4 w-4 mr-2" />
                        Enlist Partner
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Net Profit/Loss Card */}
                <Card className="bg-black/40 border-white/5 backdrop-blur-xl group hover:border-emerald-500/30 transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn(
                                "p-2 rounded-lg border",
                                totalProfit >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                            )}>
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <span className={totalProfit >= 0 ? "text-emerald-500 text-xs font-bold" : "text-rose-500 text-xs font-bold"}>
                                {totalProfit >= 0 ? "GAIN" : "DEDUCTION"}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Net Winnings</div>
                            <div className={cn("text-xl font-mono font-bold", totalProfit >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)} <span className="text-xs">SC</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ROI Card */}
                <Card className="bg-black/40 border-white/5 backdrop-blur-xl group hover:border-emerald-500/30 transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <span className={roi >= 0 ? "text-emerald-500 text-xs font-bold" : "text-rose-500 text-xs font-bold"}>
                                {roi >= 0 ? "+" : ""}{roi.toFixed(2)}%
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Performance Index</div>
                            <div className="text-xl font-mono font-bold text-white">
                                {roi.toFixed(2)}%
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lifetime Earnings */}
                <Card className="bg-black/40 border-white/5 backdrop-blur-xl group hover:border-amber-500/30 transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                <Target className="h-5 w-5" />
                            </div>
                            <span className="text-amber-500 text-xs font-bold">Total</span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Lifetime Rewards</div>
                            <div className="text-xl font-mono font-bold text-white">
                                {lifetimeEarnings.toFixed(2)} <span className="text-xs text-amber-500">SC</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Network Acceleration */}
                <Card className="bg-black/40 border-white/5 backdrop-blur-xl group hover:border-cyan-500/30 transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-500">
                                <Users className="h-5 w-5" />
                            </div>
                            <span className="text-cyan-500 text-xs font-bold">Active</span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Network Speed</div>
                            <div className="text-xl font-mono font-bold text-white">
                                {activeMembers} <span className="text-xs text-white/40">/ {totalMembers}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Credit Estimate */}
                <Card className="bg-black/40 border-white/5 backdrop-blur-xl group hover:border-purple-500/30 transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500">
                                <Zap className="h-5 w-5" />
                            </div>
                            <span className="text-purple-500 text-xs font-bold">Proj.</span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Projected Balance</div>
                            <div className="text-xl font-mono font-bold text-white">
                                {creditEstimate.toFixed(2)} <span className="text-xs text-purple-500">SC</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invite Modal */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent className="bg-black/90 border-white/10 backdrop-blur-xl text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-display font-bold uppercase tracking-wider">Enlist Strategic Partner</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Expand your network influence. Partners contribute 10 levels deep to your volume.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-6 py-4">
                        <div className="p-4 bg-white rounded-xl">
                            <QRCodeSVG value={referralLink} size={150} />
                        </div>

                        <div className="w-full space-y-2">
                            <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Secure Uplink</div>
                            <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                                <code className="flex-1 text-xs font-mono text-emerald-500 truncate">{referralLink}</code>
                                <Button size="sm" onClick={handleCopyLink} className="h-8 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black">
                                    Copy
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <Button className="w-full bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white" onClick={() => window.open(`https://twitter.com/intent/tweet?text=Join%20my%20syndicate%20on%20TRK%20Game!&url=${referralLink}`, '_blank')}>
                                Twitter
                            </Button>
                            <Button className="w-full bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc] hover:text-white" onClick={() => window.open(`https://t.me/share/url?url=${referralLink}&text=Join%20my%20syndicate!`, '_blank')}>
                                Telegram
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
