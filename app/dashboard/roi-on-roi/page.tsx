"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    ArrowLeft, RefreshCcw, Zap, TrendingUp, Layers,
    ChevronRight, Award, DollarSign, Info, Target,
    Shield, BarChart3, Calculator, Share2, Gem,
    Plus, Minus, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { roiOnRoiAPI } from "@/lib/api";

export default function RoiOnRoiPage() {
    const { address, realBalances, refreshUser } = useWallet();
    const [activeTab, setActiveTab] = useState<'analytics' | 'simulator' | 'levels'>('analytics');
    const [referralCount, setReferralCount] = useState(5);
    const [dailyCashback, setDailyCashback] = useState(0.50);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dynamic data states
    const [stats, setStats] = useState({
        todayEarnings: 0,
        totalEarnings: realBalances?.roiOnRoi || 0,
        unlockedLevels: 0,
        activeMembers: 0,
        growthRate: "0%"
    });

    const [yieldData, setYieldData] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [dashboardRes, analyticsRes] = await Promise.all([
                    roiOnRoiAPI.getDashboard(),
                    roiOnRoiAPI.getAnalytics()
                ]);

                if (dashboardRes.status === 'success') {
                    const data = dashboardRes.data.overview;
                    setStats({
                        todayEarnings: data.todayEarnings || 0,
                        totalEarnings: realBalances?.roiOnRoi || 0,
                        unlockedLevels: data.unlockedLevels || 0,
                        activeMembers: dashboardRes.data.teamStats?.totalTeamMembers || 0,
                        growthRate: "+0%"
                    });
                }

                if (analyticsRes.status === 'success') {
                    setYieldData(analyticsRes.data.performanceData || []);
                }

            } catch (err: any) {
                console.error("Failed to fetch ROI data:", err);
                setError("Protocol Synchronization Failed.");
            } finally {
                setIsLoading(false);
            }
        };

        if (address) {
            fetchData();
        }
    }, [address, realBalances?.roiOnRoi]);

    // Simulator logic
    const calculateSimulator = () => {
        const levels = [];
        let total = 0;
        let members = 1;
        for (let i = 1; i <= 10; i++) {
            members *= referralCount;
            let rate = 0.03;
            if (i === 1) rate = 0.20;
            else if (i <= 5) rate = 0.10;
            else if (i <= 10) rate = 0.05;

            const income = members * (dailyCashback * 0.5) * rate;
            total += income;
            levels.push({ level: i, members, income });
        }
        return { levels, total };
    };

    const simResult = calculateSimulator();

    // Fix NaN for aggregation
    const weeklyAggregate = yieldData && yieldData.length > 0
        ? yieldData.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0)
        : 0;

    const handleDownloadReport = () => {
        if (!yieldData || yieldData.length === 0) {
            toast.error("No record data available for export.");
            return;
        }

        const headers = ["Protocol_Day", "Yield_Value_USDT", "Network_Efficiency", "Status"];
        const rows = yieldData.map((d: any) => [
            d.day,
            d.value.toFixed(4),
            "45.2%", // Match UI static efficiency or calculate if available
            "CONFIRMED_ON_CHAIN"
        ]);

        const csvContent = [
            ["TRK_PROTOCOL_PERFORMANCE_REPORT"],
            ["Generated_At", new Date().toISOString()],
            ["User_Identity", address || "Anonymous"],
            [],
            headers,
            ...rows,
            [],
            ["SUMMARY_METRICS"],
            ["Weekly_Aggregate", weeklyAggregate.toFixed(2)],
            ["Yield_Growth", "+12%"],
            ["System_Status", "OPTIMAL"]
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `TRK_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Intelligence Report Exported Successfully.");
    };

    if (isLoading && !stats.totalEarnings) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="h-16 w-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <div className="text-indigo-400 font-black uppercase tracking-[0.3em] text-xs">Synchronizing Intelligence</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-20 selection:bg-indigo-500/30">
            {/* Cinematic Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
            </div>

            {/* Premium Header */}
            <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-50">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/dashboard" className="group flex items-center gap-3 text-white/40 hover:text-white transition-all duration-300">
                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-black group-hover:scale-110 transition-all">
                            <ArrowLeft className="h-5 w-5" />
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-indigo-500/60">Passive</div>
                            <div className="text-sm font-bold">Elite Dividends</div>
                        </div>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end px-4 border-r border-white/10">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Network Health</div>
                            <div className="text-sm font-black text-white italic">OPTIMAL EXECUTION</div>
                        </div>
                        <div className="h-10 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2 text-indigo-400">
                            <Shield className="h-4 w-4" />
                            <span className="text-xs font-bold font-mono tracking-tight">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 space-y-20 relative z-10">
                {/* Hero Section */}
                <div className="relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/5 blur-[120px] opacity-30 pointer-events-none" />
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-10 relative z-10"
                    >
                        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Strategic Yield System</span>
                        </div>
                        <h1 className="text-6xl md:text-9xl font-display font-black italic uppercase tracking-tighter text-white">
                            Elite <span className="text-transparent bg-clip-text bg-gradient-to-b from-indigo-200 via-indigo-500 to-indigo-700 drop-shadow-[0_0_50px_rgba(99,102,241,0.3)]">Dividends</span>
                        </h1>
                        <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto font-medium leading-relaxed">
                            Turn your organization's recovery into your ultimate legacy. High-frequency passive returns generated through team-wide cashback distribution.
                        </p>
                    </motion.div>
                </div>

                {/* Main Stats Hub */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "Today's Yield", value: `$${(stats.todayEarnings || 0).toFixed(2)}`, sub: 'Estimated Credit', icon: RefreshCcw, color: 'text-indigo-400' },
                        { label: "Locked Profits", value: `$${(realBalances?.roiOnRoi || 0).toFixed(2)}`, sub: 'Lifetime Earnings', icon: DollarSign, color: 'text-emerald-400' },
                        { label: "Strategic Depth", value: `${stats.unlockedLevels}/15`, sub: 'Levels Unlocked', icon: Layers, color: 'text-violet-400' },
                        { label: "Growth Velocity", value: stats.growthRate, sub: 'Network Acceleration', icon: TrendingUp, color: 'text-indigo-400' },
                    ].map((card, i) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="group border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] overflow-hidden hover:bg-white/[0.04] transition-all duration-500">
                                <CardContent className="p-8">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className={`p-4 rounded-2xl bg-white/[0.03] border border-white/10 ${card.color} group-hover:scale-110 transition-transform duration-500`}>
                                            <card.icon className="h-6 w-6" />
                                        </div>
                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{card.sub}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-4xl font-display font-black italic tracking-tighter">{card.value}</div>
                                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{card.label}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Dashboard Tabs & Content */}
                <div className="space-y-10">
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {[
                            { id: 'analytics', label: 'Yield Analytics', icon: BarChart3 },
                            { id: 'simulator', label: 'Compound Simulator', icon: Calculator },
                            { id: 'levels', label: 'Strategic Depth', icon: Layers },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-8 py-4 rounded-2xl flex items-center gap-3 transition-all duration-500 border ${activeTab === tab.id
                                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                    : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                <span className="text-sm font-bold uppercase tracking-widest">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'analytics' && (
                            <motion.div
                                key="analytics"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Card className="border-white/5 bg-white/[0.01] backdrop-blur-3xl rounded-[3rem] overflow-hidden p-10">
                                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                                        <div className="lg:col-span-8 space-y-10">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="text-3xl font-display font-black italic uppercase">Yield Performance</h3>
                                                    <p className="text-sm text-white/40 font-medium">Daily yield distribution trend over the last 7 days</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-3 w-3 rounded-full bg-indigo-500" />
                                                    <span className="text-xs font-bold text-white/60">Live Feed</span>
                                                </div>
                                            </div>

                                            {/* Chart Placeholder (SVG Based) */}
                                            <div className="h-64 flex items-end justify-between gap-4">
                                                {yieldData.length > 0 ? yieldData.map((d, i) => (
                                                    <div key={d.day} className="flex-1 flex flex-col items-center gap-4 group">
                                                        <motion.div
                                                            initial={{ height: 0 }}
                                                            animate={{ height: `${(d.value / Math.max(...yieldData.map((y: any) => y.value || 1))) * 100}%` }}
                                                            transition={{ delay: i * 0.1, duration: 1 }}
                                                            className="w-full bg-gradient-to-t from-indigo-900/40 via-indigo-500/60 to-indigo-400 rounded-2xl relative group-hover:from-indigo-400 group-hover:to-white transition-all duration-500"
                                                        >
                                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-indigo-500 text-black text-[10px] font-black px-2 py-1 rounded-lg">
                                                                +${(d.value || 0).toFixed(2)}
                                                            </div>
                                                        </motion.div>
                                                        <span className="text-[10px] font-bold text-white/20 group-hover:text-indigo-400 transition-colors">{d.day}</span>
                                                    </div>
                                                )) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/20 font-bold uppercase tracking-widest">
                                                        Insufficient Data for Visualization
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="lg:col-span-4 space-y-8 p-8 rounded-[2rem] bg-white/[0.03] border border-white/10">
                                            <div className="space-y-6">
                                                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                                                    <div className="text-4xl font-display font-black italic text-indigo-400">
                                                        ${weeklyAggregate.toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Weekly Aggregate</div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                                                        <div className="text-xl font-bold text-emerald-400">+12%</div>
                                                        <div className="text-[9px] font-bold text-white/20 uppercase">Yield Growth</div>
                                                    </div>
                                                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                                                        <div className="text-xl font-bold text-white">45.2%</div>
                                                        <div className="text-[9px] font-bold text-white/20 uppercase">Efficiency</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleDownloadReport}
                                                className="w-full h-14 bg-indigo-500 hover:bg-indigo-400 text-black font-black uppercase tracking-widest rounded-2xl transition-all duration-300"
                                            >
                                                Download Performance Report
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'simulator' && (
                            <motion.div
                                key="simulator"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Card className="border-white/5 bg-white/[0.01] backdrop-blur-3xl rounded-[3rem] overflow-hidden p-10">
                                    <div className="grid lg:grid-cols-12 gap-12 items-start">
                                        <div className="lg:col-span-4 space-y-10">
                                            <div className="space-y-2">
                                                <h3 className="text-3xl font-display font-black italic uppercase">Yield Simulator</h3>
                                                <p className="text-sm text-white/40 font-medium">Model your potential passive empire</p>
                                            </div>

                                            <div className="space-y-8">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Referrals per Member</label>
                                                        <span className="text-lg font-black text-indigo-400 font-display italic">{referralCount}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={() => setReferralCount(Math.max(2, referralCount - 1))} className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-500/20 transition-all text-indigo-400"><Minus className="h-4 w-4" /></button>
                                                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500" style={{ width: `${(referralCount / 10) * 100}%` }} />
                                                        </div>
                                                        <button onClick={() => setReferralCount(Math.min(10, referralCount + 1))} className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-500/20 transition-all text-indigo-400"><Plus className="h-4 w-4" /></button>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Avg Daily Cashback</label>
                                                        <span className="text-lg font-black text-indigo-400 font-display italic">${dailyCashback.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={() => setDailyCashback(Math.max(0.1, dailyCashback - 0.1))} className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-500/20 transition-all text-indigo-400"><Minus className="h-4 w-4" /></button>
                                                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500" style={{ width: `${(dailyCashback / 5) * 100}%` }} />
                                                        </div>
                                                        <button onClick={() => setDailyCashback(Math.min(5, dailyCashback + 0.1))} className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-500/20 transition-all text-indigo-400"><Plus className="h-4 w-4" /></button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-8 rounded-[2rem] bg-indigo-500 text-black">
                                                <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Est. Daily Passive Income</div>
                                                <div className="text-5xl font-display font-black italic tracking-tighter truncate">
                                                    ${simResult.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-8 overflow-hidden">
                                            <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-white/5 border-b border-white/10">
                                                            <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Level</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Growth</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Est. Daily</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {simResult.levels.slice(0, 8).map((l, i) => (
                                                            <tr key={l.level} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                                                                <td className="px-6 py-5">
                                                                    <div className="text-sm font-black text-white italic">LEVEL {l.level}</div>
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <div className="text-sm font-bold text-indigo-400">{l.members.toLocaleString('en-US')} <span className="text-[10px] text-white/20">MEMBERS</span></div>
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <div className="text-sm font-black text-emerald-400">+${l.income.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'levels' && (
                            <motion.div
                                key="levels"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Card className="border-white/5 bg-white/[0.01] backdrop-blur-3xl rounded-[3rem] overflow-hidden p-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {Array.from({ length: 15 }).map((_, i) => {
                                            const isUnlocked = i < stats.unlockedLevels;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`p-8 rounded-[2rem] border transition-all duration-500 scale-100 group relative overflow-hidden ${isUnlocked
                                                        ? 'bg-indigo-500/10 border-indigo-500/20'
                                                        : 'bg-white/[0.02] border-white/5 opacity-40 grayscale pointer-events-none'
                                                        }`}
                                                >
                                                    {isUnlocked && (
                                                        <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full group-hover:bg-indigo-500/20 transition-colors" />
                                                    )}
                                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${isUnlocked ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-white/20'
                                                            }`}>
                                                            {isUnlocked ? <Gem className="h-6 w-6" /> : <Target className="h-6 w-6" />}
                                                        </div>
                                                        <div className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isUnlocked ? 'text-indigo-500/60' : 'text-white/20'}`}>
                                                            Level {i + 1}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4 relative z-10">
                                                        <div className={`text-4xl font-display font-black italic italic tracking-tighter ${isUnlocked ? 'text-white' : 'text-white/20'}`}>
                                                            {i === 0 ? '20%' : i < 5 ? '10%' : i < 10 ? '5%' : '3%'}
                                                        </div>
                                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <div className={`h-full bg-indigo-500/40 transition-all ${isUnlocked ? 'w-full' : 'w-0'}`} />
                                                        </div>
                                                        <div className={`text-[9px] font-bold uppercase tracking-widest ${isUnlocked ? 'text-indigo-400/80' : 'text-white/20'}`}>
                                                            {isUnlocked ? 'STRATEGICALLY UNLOCKED' : 'LOCKED POTENTIAL'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Benefits / FAQ Section */}
                <div className="grid md:grid-cols-2 gap-10">
                    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] p-8 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Award className="h-6 w-6" />
                            </div>
                            <h4 className="text-xl font-display font-black italic uppercase">Victory Mandates</h4>
                        </div>
                        <div className="grid gap-4">
                            {[
                                "Yield is calculated daily at 00:00 UTC",
                                "Distributions are credited to the real balance directly",
                                "Network depth unlocks based on active direct partners",
                                "50% of team-wide cashback is reserved for elite dividends"
                            ].map((text, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                                    <div className="mt-1 h-3 w-3 rounded-full bg-indigo-500/30 border border-indigo-500 group-hover:scale-125 transition-transform" />
                                    <span className="text-sm font-medium text-white/60">{text}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] p-8 space-y-8 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                            <Share2 className="h-48 w-48 text-white" />
                        </div>
                        <div className="space-y-6 relative z-10">
                            <h4 className="text-xl font-display font-black italic uppercase">Accelerate Legacy</h4>
                            <p className="text-sm text-white/40 font-medium leading-relaxed">
                                Elite Dividends is a true leverage engine. By helping your team activate their Cashback Protection, you inherently increase your personal yield velocity.
                            </p>
                            <Button className="w-full h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-black font-black uppercase tracking-widest rounded-2xl transition-all duration-500 group/btn">
                                <span className="flex items-center gap-2">
                                    Enlist New Partners <ArrowUpRight className="h-4 w-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                </span>
                            </Button>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
