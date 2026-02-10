"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { freeCreditsAPI } from "@/lib/api";
import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Gift, Clock, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type FreeCreditsStatus = {
    canClaim: boolean;
    dailyAmount: number;
    lastClaimed: string | null;
    nextClaimTime: string | null;
    remainingCooldownMs: number;
    totalClaimed: number;
    currentCredits: number;
};

const formatCooldown = (ms: number) => {
    if (!ms || ms <= 0) return "Ready";
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.ceil((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

export default function FreeCreditsPage() {
    const router = useRouter();
    const { isConnected, isLoading, refreshUser } = useWallet();
    const [status, setStatus] = useState<FreeCreditsStatus | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        if (isLoading) return;
        if (typeof window !== "undefined") {
            const hasToken = !!localStorage.getItem("trk_token");
            if (hasToken) return;
        }
        if (!isConnected) {
            router.push("/auth");
        }
    }, [isConnected, isLoading, router]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const loadStatus = async () => {
        try {
            const res = await freeCreditsAPI.status();
            if (res.status !== "success") throw new Error(res.message || "Failed to load status");
            setStatus(res.data);
        } catch (err: any) {
            toast.error(err.message || "Failed to load free credits status");
        }
    };

    useEffect(() => {
        loadStatus();
    }, []);

    const handleClaim = async () => {
        setIsClaiming(true);
        const toastId = toast.loading("Claiming free credits...");
        try {
            const res = await freeCreditsAPI.claim();
            if (res.status !== "success") throw new Error(res.message || "Claim failed");
            toast.success("Free credits added to your balance.", { id: toastId });
            await loadStatus();
            refreshUser();
        } catch (err: any) {
            toast.error(err.message || "Claim failed", { id: toastId });
        } finally {
            setIsClaiming(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="bg-transparent pb-32">
            <main className="container mx-auto px-4 py-8 space-y-10">
                {/* Hero Header Section */}
                <div className="relative rounded-[2.5rem] overflow-hidden bg-black border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.6)] group mb-10">
                    {/* Living Background Mesh */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_60%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_100%)] z-0" />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 p-10 md:p-12">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-[10px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(16,185,129,0.1)] backdrop-blur-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                No Purchase Necessary
                            </div>
                            <h1 className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter drop-shadow-2xl">
                                FREE CREDITS
                            </h1>
                            <p className="text-lg text-white/40 font-medium max-w-md leading-relaxed">
                                Claim daily GC credits to play for free. This is the legally required free entry option.
                            </p>
                        </motion.div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 lg:gap-4">
                            <Link href="/membership">
                                <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 h-12 px-6 font-bold uppercase tracking-widest text-xs">
                                    Buy Credits
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="absolute bottom-0 inset-x-0 bg-white/5 border-t border-white/5 backdrop-blur-md px-10 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-20">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "h-2 w-2 rounded-full animate-pulse",
                                status?.canClaim ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                            <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
                                {status?.canClaim ? "Claim Available" : "Cooldown Active"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-white/40" />
                            <span className="text-xs font-mono font-medium text-white/50">
                                Next: {status ? formatCooldown(status.remainingCooldownMs) : "--"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Claim Card */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                >
                    <motion.div variants={itemVariants}>
                        <Card className="bg-black/40 border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-emerald-500/50 transition-all duration-500 hover:shadow-[0_0_50px_rgba(16,185,129,0.15)] relative">
                            {/* Gradient Overlay on Hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <CardContent className="p-8 space-y-8 relative z-10">
                                {/* Claim Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                            <Gift className="h-8 w-8 text-emerald-400 group-hover:text-black transition-colors" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-white/60">Daily Credits</div>
                                            <div className="text-4xl font-black text-white">{status?.dailyAmount ?? 0} <span className="text-2xl text-emerald-500">GC</span></div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleClaim}
                                        disabled={!status?.canClaim || isClaiming}
                                        className={cn(
                                            "h-16 px-10 font-black uppercase tracking-widest text-sm transition-all",
                                            status?.canClaim
                                                ? "bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-105 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                                                : "bg-white/5 text-white/40 cursor-not-allowed"
                                        )}
                                    >
                                        {isClaiming ? (
                                            <>
                                                <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : status?.canClaim ? (
                                            <>
                                                <Gift className="h-5 w-5 mr-2" />
                                                Claim Free Credits
                                            </>
                                        ) : (
                                            <>
                                                <Clock className="h-5 w-5 mr-2" />
                                                Cooldown Active
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid md:grid-cols-3 gap-4 pt-6 border-t border-white/5">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Current Balance</div>
                                        <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                                            {status?.currentCredits ?? "--"}
                                            <span className="text-sm text-emerald-500">GC</span>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Total Claimed</div>
                                        <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                                            {status?.totalClaimed ?? "--"}
                                            <span className="text-sm text-emerald-500">GC</span>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Next Claim</div>
                                        <div className="text-sm font-bold text-white">
                                            {status?.nextClaimTime
                                                ? (isClient ? new Date(status.nextClaimTime).toLocaleString() : "Loading...")
                                                : "Available Now"}
                                        </div>
                                    </div>
                                </div>

                                {/* Info Banner */}
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                    <Clock className="h-5 w-5 text-emerald-400 shrink-0" />
                                    <span className="text-xs text-white/60">
                                        Claims reset every 24 hours. Come back daily to maximize your free credits!
                                    </span>
                                </div>
                            </CardContent>

                            {/* Scanline Decoration */}
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </Card>
                    </motion.div>

                    {/* Additional Info Cards */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <motion.div variants={itemVariants}>
                            <Card className="bg-black/40 border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-purple-500/50 transition-all duration-500 relative h-full">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <CardContent className="p-6 space-y-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                                            <TrendingUp className="h-6 w-6 text-purple-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white">Want More Credits?</div>
                                            <div className="text-xs text-white/50">Upgrade to premium packages</div>
                                        </div>
                                    </div>
                                    <Link href="/membership">
                                        <Button className="w-full bg-purple-500/20 hover:bg-purple-500 text-purple-400 hover:text-black border border-purple-500/30 font-bold uppercase tracking-widest text-xs transition-all">
                                            View Membership →
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Card className="bg-black/40 border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-blue-500/50 transition-all duration-500 relative h-full">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <CardContent className="p-6 space-y-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                                            <ShieldCheck className="h-6 w-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white">Compliance Notice</div>
                                            <div className="text-xs text-white/50">Sweepstakes policy</div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/60 leading-relaxed">
                                        Free credits are part of our sweepstakes compliance policy. No purchase is necessary to participate.
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
