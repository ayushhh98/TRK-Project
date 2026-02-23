"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { CountdownTimer } from "@/components/dashboard/CountdownTimer";
import { CyberneticTerminal } from "@/components/dashboard/CyberneticTerminal";
import { Trophy, Coins, Users, TrendingUp, Zap, ShieldCheck, Wallet, Play, AlertTriangle, Copy } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DepositModal } from "@/components/cash/DepositModal";
import { WithdrawalModal } from "@/components/cash/WithdrawalModal";
import { EarningsNexus } from "@/components/dashboard/EarningsNexus";
import { HardenedCapital } from "@/components/dashboard/HardenedCapital";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { LuckyDraw } from "@/components/dashboard/LuckyDraw";
import { PromoPoster } from "@/components/dashboard/PromoPoster";
import { LaunchPoster } from "@/components/dashboard/LaunchPoster";
import { StatCard } from "@/components/dashboard/StatCard";
import { IncomeModuleCard } from "@/components/dashboard/IncomeModuleCard";
import { RefreshCw, User } from "lucide-react";
import { LiveWinnerFeed } from "@/components/jackpot/LiveWinnerFeed";
import { PromoCarousel } from "@/components/dashboard/PromoCarousel";
import { ProfileModal } from "@/components/dashboard/ProfileModal";
import { contentAPI } from "@/lib/api";
import { BalanceAnimator } from "@/components/cash/BalanceAnimator";
import { ConfettiEffect } from "@/components/effects/ConfettiEffect";
import { toast } from "sonner";
import { dedupeByKey } from "@/lib/collections";
import { PracticeTransferModal } from "@/components/cash/PracticeTransferModal";


export default function DashboardPage() {
    const {
        isConnected, address, user, practiceBalance, practiceExpiry,
        gameHistory, disconnect, isLoading, isRegisteredOnChain, registerOnChain,
        nativeBalance, usdtBalance, isRealMode, setIsRealMode, realBalances,
        refreshUser, linkWallet, deposit, isSwitchingWallet, hasRealAccess
    } = useWallet();

    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [posters, setPosters] = useState<any[]>([]);
    const router = useRouter();

    // Redirect to auth if not connected
    useEffect(() => {
        if (isLoading || isSwitchingWallet) return;
        if (typeof window !== "undefined") {
            const hasToken = !!localStorage.getItem("trk_token");
            if (hasToken) return;
        }
        if (!isConnected) {
            router.push("/auth");
        }
    }, [isConnected, isLoading, isSwitchingWallet, router]);

    const fetchPosters = async () => {
        try {
            const res = await contentAPI.getPosters();
            if (res.status === 'success') {
                const incoming = Array.isArray(res.data) ? res.data : [];
                setPosters(dedupeByKey(incoming, (p) => p?._id || p?.type));
            }
        } catch (error) {
            console.error("Failed to fetch posters:", error);
            setPosters([]);
        }
    };

    useEffect(() => {
        setIsClient(true);
        fetchPosters();
    }, []);

    // Calculate stats
    const gamesPlayed = gameHistory.length;
    const wins = gameHistory.filter(h => h.won).length;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
    const netChange = gameHistory.reduce((acc, h) => acc + (h.won ? h.amount * 6 : -h.amount), 0);

    const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not Connected";
    const displayAddress = isClient ? shortAddress : "Not Connected";
    const hasWallet = isClient && !!address;
    const minGasBalance = Number.isFinite(Number(process.env.NEXT_PUBLIC_MIN_GAS_BNB))
        ? Number(process.env.NEXT_PUBLIC_MIN_GAS_BNB)
        : 0.002;
    const nativeBalanceValue = isClient ? Number.parseFloat(nativeBalance || "0") : 0;
    const showGasHelp = hasWallet && !isLoading && Number.isFinite(nativeBalanceValue) && nativeBalanceValue < minGasBalance;

    const handleCopyAddress = async () => {
        if (!address || typeof navigator === "undefined") return;
        try {
            await navigator.clipboard.writeText(address);
            toast.success("Wallet address copied");
        } catch (err) {
            console.error("Copy address failed:", err);
            toast.error("Failed to copy address");
        }
    };

    const promoPoster = posters.find(p => p.type === 'promo');
    const launchPoster = posters.find(p => p.type === 'launch');

    return (
        <div className="bg-transparent pb-32">
            <ConfettiEffect />
            <main className="container mx-auto px-4 py-6 space-y-8">
                {/* Simplified Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-black via-black/95 to-black/90 border border-white/10 shadow-2xl"
                >
                    {/* Background Effects */}
                    <div className={cn(
                        "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--gradient-color),transparent_60%)] transition-colors duration-700",
                        isRealMode ? "[--gradient-color:rgba(245,158,11,0.12)]" : "[--gradient-color:rgba(16,185,129,0.12)]"
                    )} />

                    <div className="relative z-10 p-8">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                            <div className="flex items-start gap-4">
                                <div>
                                    <div className={cn(
                                        "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase mb-3",
                                        isRealMode
                                            ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                    )}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isRealMode ? "bg-amber-500" : "bg-emerald-500")} />
                                        Dashboard
                                    </div>
                                    <h1 className="text-4xl lg:text-5xl font-display font-black text-white tracking-tight">
                                        Welcome Back
                                    </h1>
                                    <div className="flex items-center gap-3 mt-2">
                                        <p className="text-white/50">{displayAddress}</p>
                                        <ProfileModal asChild>
                                            <button className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors flex items-center gap-1.5">
                                                <User className="h-3 w-3" />
                                                Profile
                                            </button>
                                        </ProfileModal>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                {/* Mode Toggle */}
                                <div className="flex items-center gap-1 p-1 bg-black/60 border border-white/10 rounded-xl shadow-lg">
                                    <button
                                        onClick={() => setIsRealMode(false)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                            !isRealMode ? "bg-white text-black" : "text-white/40 hover:text-white"
                                        )}
                                    >
                                        Practice
                                    </button>
                                    <button
                                        onClick={() => hasRealAccess && setIsRealMode(true)}
                                        disabled={!hasRealAccess}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                                            isRealMode ? "bg-primary text-black" : "text-white/40 hover:text-white",
                                            !hasRealAccess && "opacity-40 cursor-not-allowed"
                                        )}
                                    >
                                        <ShieldCheck className="h-3 w-3" />
                                        Real
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row: Stats + Timer */}
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                            <div className={cn(
                                "flex items-center gap-6 p-5 pr-10 rounded-2xl backdrop-blur-sm border transition-all",
                                isRealMode
                                    ? "bg-amber-500/5 border-amber-500/10"
                                    : "bg-emerald-500/5 border-emerald-500/10"
                            )}>
                                <div className={cn(
                                    "h-16 w-16 rounded-xl flex items-center justify-center border",
                                    isRealMode
                                        ? "bg-amber-500/20 border-amber-500/20"
                                        : "bg-emerald-500/20 border-emerald-500/20"
                                )}>
                                    {isRealMode ?
                                        <ShieldCheck className="h-8 w-8 text-amber-500" /> :
                                        <Coins className="h-8 w-8 text-emerald-500" />
                                    }
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                                        {isRealMode ? "Total Assets" : "Practice Mode Balance"}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        {isRealMode ? (
                                            <>
                                                <BalanceAnimator
                                                    balance={((realBalances.cash || 0) + (realBalances.game || 0)).toFixed(2)}
                                                    className="text-4xl font-mono font-bold text-white tracking-tight"
                                                    suffix=""
                                                />
                                                <span className="text-sm font-bold text-amber-500">USDT</span>
                                            </>
                                        ) : (
                                            <div className="relative group">
                                                <div className="absolute -inset-2 bg-blue-500/10 blur-xl rounded-2xl group-hover:bg-blue-500/20 transition-all" />
                                                <div className="relative flex items-baseline gap-2">
                                                    <BalanceAnimator
                                                        balance={parseFloat(practiceBalance?.toString() || "0").toFixed(2)}
                                                        className="text-4xl font-mono font-bold text-blue-400 tracking-tight"
                                                        suffix=""
                                                    />
                                                    <span className="text-sm font-bold text-blue-400/60 uppercase tracking-widest">USDT</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {!isRealMode && hasRealAccess && (
                                        <button
                                            onClick={() => setIsTransferOpen(true)}
                                            className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-400 hover:text-black transition-all"
                                        >
                                            <Zap className="h-3 w-3" />
                                            Bridge to Game
                                        </button>
                                    )}
                                </div>
                            </div>

                            <CountdownTimer expiryDate={practiceExpiry} />
                        </div>
                    </div>
                </motion.div>


                {/* Real Money Unlock Banner */}
                {
                    !hasRealAccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                    <ShieldCheck className="h-6 w-6 text-amber-500 animate-pulse" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-white">Unlock Real Money Mode</div>
                                    <p className="text-xs text-white/60">Make your first deposit to start earning real rewards.</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => setIsDepositOpen(true)}
                                className="bg-amber-500 text-black hover:bg-amber-400 font-black uppercase text-xs px-6 h-10 rounded-xl whitespace-nowrap"
                            >
                                <Wallet className="h-4 w-4 mr-2" />
                                Make Deposit
                            </Button>
                        </motion.div>
                    )
                }

                {/* Low USDT Balance Banner (Sequential to the screenshot provided) */}
                {
                    hasRealAccess && (realBalances.grandTotal || 0) < 5 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl overflow-hidden bg-red-500/10 border border-red-500/20 p-4 flex items-center justify-between gap-4 mb-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-red-500">Low Ecosystem Balance</div>
                                    <p className="text-xs text-white/50">Total Assets: {(realBalances.grandTotal || 0).toFixed(2)} USDT. Minimum 5 USDT recommended for play.</p>
                                </div>
                            </div>
                            <Link
                                href="https://pancakeswap.finance/swap?outputCurrency=0x55d398326f99059fF775485246999027B3197955&chain=bsc"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button className="bg-red-600 text-white hover:bg-red-700 font-black uppercase text-xs px-6 h-10 rounded-xl whitespace-nowrap">
                                    GET USDT
                                </Button>
                            </Link>
                        </motion.div>
                    )
                }

                {/* Hero Section: Game CTA + Protocol Owner */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Game CTA */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Promotional Carousel */}
                        <PromoCarousel />
                        <LaunchPoster
                            title={launchPoster?.title}
                            description={launchPoster?.description}
                            link={launchPoster?.link}
                            stats={launchPoster?.stats}
                            imageUrl={launchPoster?.imageUrl}
                        />
                    </div>

                    {/* Right: Protocol Owner Poster */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <PromoPoster
                            title={promoPoster?.title}
                            description={promoPoster?.description}
                            link={promoPoster?.link}
                            imageUrl={promoPoster?.imageUrl}
                        />
                    </motion.div>
                </div>

                {/* Live Winner Ticker */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <LiveWinnerFeed variant="ticker" maxItems={15} />
                </motion.div>

                {/* Row 1: Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0, duration: 0.5, type: "spring", stiffness: 100 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                    >
                        <StatCard
                            title="Total Balance"
                            value={`${isRealMode ? (realBalances.totalUnified || 0).toFixed(2) : parseFloat(practiceBalance?.toString() || "0").toFixed(2)} USDT`}
                            subtitle={isRealMode ? "Real Money" : "Practice Mode"}
                            icon={Wallet}
                            color={isRealMode ? "amber" : "emerald"}
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 100 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                    >
                        <StatCard
                            title="Performance"
                            value={`${winRate}%`}
                            subtitle={`${wins} wins / ${gamesPlayed} games`}
                            icon={TrendingUp}
                            trend={{ value: `${netChange.toFixed(2)} USDT`, isPositive: netChange >= 0 }}
                            color="cyan"
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 100 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                    >
                        <StatCard
                            title="Network"
                            value={user?.directReferrals || 0}
                            subtitle={isRegisteredOnChain ? "On-chain verified" : "Registration pending"}
                            icon={Users}
                            color="purple"
                        />
                    </motion.div>
                </div>

                {/* Row 2: Analytics */}
                <div className="grid lg:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
                        whileHover={{ scale: 1.01 }}
                        className="lg:col-span-2 h-[400px]"
                    >
                        <EarningsNexus />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
                        whileHover={{ scale: 1.01 }}
                        className="lg:col-span-1 h-[400px]"
                    >
                        <HardenedCapital />
                    </motion.div>
                </div>

                {/* Row 3: Performance */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6, type: "spring" }}
                >
                    <PerformanceMetrics />
                </motion.div>

                {/* Row 4: Active Income Modules */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6, type: "spring" }}
                >
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-8 w-1 bg-amber-500 rounded-full" />
                        <h2 className="text-2xl font-display font-black text-white tracking-widest uppercase">
                            Active Income
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <IncomeModuleCard
                            title="Winners 8X Income"
                            description="Win the game and receive: 2X Direct Payout + 6X Auto Compound."
                            icon={Trophy}
                            moduleId="Module_01"
                            multiplier="8.0x"
                            href="/dashboard/income"
                            color="orange"
                            isLocked={false}
                        />
                        <IncomeModuleCard
                            title="Direct Level Income"
                            description="Earn commissions from team deposits across 15 dynamic levels."
                            icon={Users}
                            moduleId="Module_02"
                            stat={{ label: "Levels", value: "1-15" }}
                            href="/dashboard/referral"
                            color="emerald"
                            isLocked={!user?.activation?.canWithdrawDirectLevel}
                        />
                        <IncomeModuleCard
                            title="Winner Level Income"
                            description="Earn 15% leveraged commission when your team wins games."
                            icon={Zap}
                            moduleId="Module_03"
                            stat={{ label: "Leverage", value: "15%" }}
                            href="/dashboard/referral"
                            color="blue"
                            isLocked={!user?.activation?.canWithdrawWinners}
                        />
                    </div>
                </motion.div>

                {/* Row 5: Passive & Protection Income Modules */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.6, type: "spring" }}
                    className="mt-12"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-8 w-1 bg-indigo-500 rounded-full" />
                        <h2 className="text-2xl font-display font-black text-white tracking-widest uppercase">
                            Passive & Protection
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <IncomeModuleCard
                            title="Cashback Protection"
                            description="Daily auto-recovery of net losses. Capital protection up to 800%."
                            icon={ShieldCheck}
                            moduleId="Module_04"
                            stat={{ label: "Recovery", value: "Daily" }}
                            href="/dashboard/cashback"
                            color="indigo"
                            isLocked={!user?.activation?.cashbackActive}
                        />
                        <IncomeModuleCard
                            title="ROI on ROI"
                            description="Earn from your team's cashback. Passive daily compound income."
                            icon={TrendingUp}
                            moduleId="Module_05"
                            stat={{ label: "Depth", value: "15 Levels" }}
                            href="/dashboard/roi-on-roi"
                            color="cyan"
                            isLocked={!user?.activation?.allStreamsUnlocked}
                        />
                        <IncomeModuleCard
                            title="Club Income"
                            description="Leadership rewards. Earn a share of platform's daily turnover."
                            icon={Trophy}
                            moduleId="Module_06"
                            stat={{ label: "Pool", value: "8% Share" }}
                            href="/dashboard/club"
                            color="purple"
                            isLocked={!user?.activation?.allStreamsUnlocked}
                        />
                        <LuckyDraw />
                    </div>
                </motion.div>
            </main >

            {/* Modals */}
            <DepositModal
                isOpen={isDepositOpen}
                onClose={() => setIsDepositOpen(false)}
                onConfirm={async (amount: number) => {
                    await deposit(amount);
                }}
            />
            <WithdrawalModal
                isOpen={isWithdrawOpen}
                onClose={() => setIsWithdrawOpen(false)}
            />
            <PracticeTransferModal
                isOpen={isTransferOpen}
                onClose={() => setIsTransferOpen(false)}
            />
        </div>
    );
}

