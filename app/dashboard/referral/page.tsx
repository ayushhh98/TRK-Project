"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    Users, Copy, CheckCheck, TrendingUp, ArrowLeft,
    Share2, Gift, Coins, ChevronRight, ChevronDown,
    Twitter, Send, MessageCircle, Star, Zap, Target, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useReadContract } from "wagmi";
import { referralAPI } from "@/lib/api";
import { TRKGameABI } from "@/config/abis";
import { GAME_CONTRACT_ADDRESS } from "@/config/contracts";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";

// Practice Referral Rewards Structure (based on 100 USDT base)
const practiceRewardStructure = [
    { levels: "Level 1", percent: "10%", usdt: 10, color: "emerald" },
    { levels: "Level 2-5", percent: "2%", usdt: 2, color: "blue" },
    { levels: "Level 6-10", percent: "1%", usdt: 1, color: "amber" },
    { levels: "Level 11-15", percent: "0.5%", usdt: 0.5, color: "indigo" },
    { levels: "Level 16-50", percent: "0.25%", usdt: 0.25, color: "pink" },
    { levels: "Level 51-100", percent: "0.10%", usdt: 0.10, color: "orange" },
];

const powerOf10Matrix = [
    { level: 1, teamSize: 10, bonus: 10, totalReward: 100 },
    { level: 2, teamSize: 100, bonus: 2, totalReward: 200 },
    { level: 3, teamSize: 1000, bonus: 2, totalReward: 2000 },
    { level: 4, teamSize: 10000, bonus: 2, totalReward: 20000 },
    { level: 5, teamSize: 100000, bonus: 2, totalReward: 200000 },
    { level: 6, teamSize: 1000000, bonus: 1, totalReward: 1000000 },
    { level: 7, teamSize: 10000000, bonus: 1, totalReward: 10000000 },
    { level: 8, teamSize: 100000000, bonus: 1, totalReward: 100000000 },
    { level: 9, teamSize: 1000000000, bonus: 1, totalReward: 1000000000 },
    { level: 10, teamSize: 10000000000, bonus: 1, totalReward: 10000000000 },
];

// Mocks removed as data is now fetched from backend

export default function ReferralPage() {
    const { address, isRegisteredOnChain, registerOnChain } = useWallet();
    const [copied, setCopied] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const [showPowerOf10, setShowPowerOf10] = useState(false);
    const [stats, setStats] = useState<any>(null);

    // Fetch live user data from contract
    const { data: balanceData } = useReadContract({
        address: GAME_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRKGameABI,
        functionName: 'getUserBalances',
        args: [address as `0x${string}`],
        query: {
            enabled: !!address && (GAME_CONTRACT_ADDRESS as string) !== "0x0000000000000000000000000000000000000000"
        }
    }) as { data: any };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await referralAPI.getStats();
                if (res.status === 'success') {
                    setStats(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch referral stats", err);
            }
        };
        if (address) fetchStats();
    }, [address]);

    const referralLink = stats?.referralCode
        ? `https://trk.game/ref/${stats.referralCode}`
        : address ? `https://trk.game/ref/${address.slice(2, 8).toUpperCase()}` : "Connect wallet to get your link";

    const totalReward = stats?.totals?.totalEarned || 0;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSocialShare = (platform: string) => {
        const text = encodeURIComponent("Join me on TRK Game! Build your empire and earn across 100 levels. 🚀");
        const url = encodeURIComponent(referralLink);

        let shareUrl = "";
        switch (platform) {
            case "twitter":
                shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
                break;
            case "telegram":
                shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
                break;
            case "whatsapp":
                shareUrl = `https://wa.me/?text=${text}%20${url}`;
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <div className="min-h-screen bg-background pb-32 selection:bg-emerald-500/30">
            {!isRegisteredOnChain && address && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 py-3 px-6 text-center">
                    <p className="text-amber-500 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3">
                        <AlertCircle className="h-4 w-4" />
                        Identity not secured on blockchain.
                        <button onClick={registerOnChain} className="underline hover:text-white transition-colors ml-2">Secure Now</button>
                    </p>
                </div>
            )}
            {/* Cinematic Header */}
            <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-50">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/dashboard" className="group flex items-center gap-3 text-white/40 hover:text-white transition-all duration-300">
                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black group-hover:scale-110 transition-all">
                            <ArrowLeft className="h-5 w-5" />
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-emerald-500/60">Ecosystem</div>
                            <div className="text-sm font-bold">Growth Hub</div>
                        </div>
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="h-12 flex items-center gap-3 px-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Network Expansion Live</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 lg:py-20 space-y-24">
                {/* Hero Section */}
                <div className="relative">
                    {/* Prestigious Background FX */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/5 blur-[120px] opacity-30 pointer-events-none" />

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-10 relative z-10"
                    >
                        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] backdrop-blur-3xl">
                            <Users className="h-4 w-4" />
                            Leadership Growth Center
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-6xl md:text-9xl font-display font-black italic uppercase tracking-tighter text-white">
                                Team & <span className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 via-emerald-500 to-emerald-700 drop-shadow-[0_0_50px_rgba(16,185,129,0.3)]">Growth</span>
                            </h1>
                            <p className="text-white/40 max-w-2xl mx-auto uppercase tracking-widest text-xs md:text-sm font-medium leading-relaxed">
                                Build your empire and earn across <span className="text-emerald-400 font-black">100 Levels</span>.
                                <br />
                                <span className="text-emerald-400/80 font-black">Empower others. Grow your practice rewards.</span>
                            </p>
                        </div>

                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="flex flex-col md:flex-row gap-4 items-center bg-black/40 border border-white/5 p-2 rounded-[2rem] backdrop-blur-3xl">
                                <div className="flex-1 bg-white/5 rounded-2xl px-6 py-4 font-mono text-sm text-white/60 truncate w-full text-center md:text-left">
                                    {referralLink}
                                </div>
                                <Button onClick={handleCopy} className="h-14 px-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 whitespace-nowrap w-full md:w-auto">
                                    {copied ? <CheckCheck className="h-5 w-5 mr-3" /> : <Copy className="h-5 w-5 mr-3" />}
                                    {copied ? "Copied Link" : "Grab Link"}
                                </Button>
                            </div>
                            <div className="flex items-center justify-center gap-8 py-2">
                                <button
                                    onClick={() => handleSocialShare("twitter")}
                                    className="text-white/20 hover:text-emerald-400 transition-colors uppercase text-[10px] font-black tracking-widest"
                                >
                                    Share on Twitter
                                </button>
                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                <button
                                    onClick={() => handleSocialShare("telegram")}
                                    className="text-white/20 hover:text-emerald-400 transition-colors uppercase text-[10px] font-black tracking-widest"
                                >
                                    Telegram Blast
                                </button>
                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                <button
                                    onClick={() => handleSocialShare("whatsapp")}
                                    className="text-white/20 hover:text-emerald-400 transition-colors uppercase text-[10px] font-black tracking-widest"
                                >
                                    WhatsApp Invite
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Earnings', value: `$${totalReward.toFixed(2)}`, sub: 'PRACTICE BONUS', icon: Gift, color: 'emerald' },
                        { label: 'Team Size', value: stats?.totals?.members || '0', sub: 'LAST 10 LEVELS', icon: Users, color: 'blue' },
                        { label: 'Active Today', value: stats?.totals?.active || '0', sub: 'ENGAGED MEMBERS', icon: Zap, color: 'amber' },
                        { label: 'Directs', value: `${stats?.directReferrals || 0}/${stats?.maxDirectReferrals || 20}`, sub: 'BONUS CAPACITY', icon: Target, color: 'purple' }
                    ].map((stat, i) => (
                        <Card key={i} className="border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] overflow-hidden group hover:border-emerald-500/20 transition-all duration-500">
                            <CardContent className="p-8 space-y-4">
                                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover:bg-emerald-500/20 group-hover:text-emerald-500 transition-all duration-500 group-hover:rotate-6">
                                    <stat.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">{stat.label}</div>
                                    <div className="text-3xl font-black text-white italic tracking-tight">{stat.value}</div>
                                    <div className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest mt-1">{stat.sub}</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Growth Chart & Activation Hub */}
                <div className="grid lg:grid-cols-12 gap-10">
                    {/* Growth Analytics */}
                    <div className="lg:col-span-8">
                        <Card className="border-white/5 bg-white/[0.01] backdrop-blur-3xl rounded-[3rem] overflow-hidden h-full p-10 space-y-10">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Growth <span className="text-white/20">Analytics</span></h2>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Weekly Team Expansion</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Organic Volume</span>
                                </div>
                            </div>

                            <div className="h-[300px] w-full relative group">
                                {stats?.growthData ? (
                                    <svg className="w-full h-full" viewBox="0 0 800 300">
                                        <defs>
                                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d={`M0,300 ${stats.growthData.map((d: any, i: number) =>
                                                `L${(i * 800) / (stats.growthData.length - 1)},${300 - (d.newMembers * 15)}`
                                            ).join(' ')} L800,300 Z`}
                                            fill="url(#chartGradient)"
                                            className="transition-all duration-1000"
                                        />
                                        <path
                                            d={`M0,${300 - (stats.growthData[0].newMembers * 15)} ${stats.growthData.map((d: any, i: number) =>
                                                `L${(i * 800) / (stats.growthData.length - 1)},${300 - (d.newMembers * 15)}`
                                            ).join(' ')}`}
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                        />
                                        {/* Data Points */}
                                        {stats.growthData.map((d: any, i: number) => (
                                            <circle
                                                key={i}
                                                cx={(i * 800) / (stats.growthData.length - 1)}
                                                cy={300 - (d.newMembers * 15)}
                                                r="6"
                                                fill="#10b981"
                                                className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
                                            />
                                        ))}
                                    </svg>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/20 font-black uppercase tracking-widest text-[10px]">
                                        Loading Analytics...
                                    </div>
                                )}
                                {/* Grid Lines Overlay */}
                                <div className="absolute inset-0 border-b border-white/5 flex flex-col justify-between pointer-events-none">
                                    <div className="border-t border-white/5 w-full h-0" />
                                    <div className="border-t border-white/5 w-full h-0" />
                                    <div className="border-t border-white/5 w-full h-0" />
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-4 text-center">
                                {(stats?.growthData || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((d: any, i: number) => (
                                    <div key={i} className="text-[10px] font-black text-white/20 uppercase tracking-widest">{d.date || d}</div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Activation Hub */}
                    <div className="lg:col-span-4">
                        <Card className="border-white/5 bg-white/[0.01] backdrop-blur-3xl rounded-[3rem] overflow-hidden h-full p-10 space-y-12">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Level <span className="text-white/20">Hub</span></h2>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Organizational Health</p>
                            </div>

                            <div className="space-y-8">
                                {[
                                    {
                                        label: 'Tier 1 Activation',
                                        percent: stats?.totals?.tier1Percent || 0,
                                        color: 'emerald',
                                        detail: 'Unlocked Basic Rewards'
                                    },
                                    {
                                        label: 'Tier 2 Expansion',
                                        percent: stats?.totals?.tier2Percent || 0,
                                        color: 'blue',
                                        detail: 'Full Ecosystem Access'
                                    },
                                    {
                                        label: 'Loyalty Retention',
                                        percent: stats?.totals?.members > 0 ? Math.round((stats?.totals?.active / stats.totals.members) * 100) : 0,
                                        color: 'amber',
                                        detail: 'Active Game Participation'
                                    }
                                ].map((hub, i) => (
                                    <div key={i} className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{hub.label}</div>
                                                <div className="text-[9px] font-bold text-emerald-500/60 uppercase">{hub.detail}</div>
                                            </div>
                                            <div className="text-xl font-black text-white">{hub.percent}%</div>
                                        </div>
                                        <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${hub.percent}%` }}
                                                className={`h-full bg-gradient-to-r from-${hub.color}-600 to-${hub.color}-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest transition-all">
                                Download Growth Report
                            </Button>
                        </Card>
                    </div>
                </div>

                {/* Practice Rewards Matrix & Power of 10 */}
                <div className="space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">The <span className="text-emerald-500">Power Matrix</span></h2>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Theoretical Potential Earning (10x10 Matrix)</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-10">
                        {/* Structure */}
                        <Card className="border-white/5 bg-white/[0.01] backdrop-blur-3xl rounded-[3rem] p-10">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-8">Reward Structure</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {practiceRewardStructure.map((tier, i) => (
                                    <div key={i} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 group hover:bg-emerald-500/5 transition-all duration-500">
                                        <div className="text-2xl font-black text-emerald-400 italic mb-1">{tier.percent}</div>
                                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">{tier.levels}</div>
                                        <div className="h-px w-full bg-white/5 group-hover:bg-emerald-500/20 transition-all mb-3" />
                                        <div className="text-xs font-bold text-white/20">${tier.usdt} <span className="text-[9px] uppercase tracking-tighter">per user</span></div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Power of 10 Dynamic Matrix */}
                        <Card className="border-white/5 bg-white/[0.01] backdrop-blur-3xl rounded-[3rem] p-10 flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-emerald-400 italic uppercase tracking-tight">Earning Potential</h3>
                                <button
                                    onClick={() => setShowPowerOf10(!showPowerOf10)}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-emerald-500 hover:text-black transition-all group"
                                >
                                    {showPowerOf10 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto max-h-[350px] pr-4 scrollbar-thin scrollbar-thumb-white/10">
                                {powerOf10Matrix.map((row, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-emerald-500/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center font-black text-xs text-white/40 group-hover:text-emerald-500 group-hover:border-emerald-500/30 transition-all">
                                                L{row.level}
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{row.teamSize.toLocaleString('en-US')} MEMBERS</div>
                                                <div className="text-lg font-black text-white tracking-tight italic">${row.totalReward.toLocaleString('en-US')}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[8px] font-black text-emerald-500/40 uppercase tracking-widest">Bonus</div>
                                            <div className="text-sm font-bold text-emerald-400">${row.bonus}/Usdt</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-6 rounded-2xl bg-emerald-500 text-black font-black uppercase text-center tracking-widest italic cursor-pointer hover:scale-105 active:scale-95 transition-all">
                                Aiming for Level 10
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Network Dossier (Tree) */}
                <div className="space-y-12">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Network <span className="text-white/20">Dossier</span></h2>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Real-time Team Structure</p>
                        </div>
                        <Button variant="outline" className="border-white/10 text-white/40 hover:text-white uppercase text-[10px] font-black tracking-widest h-12 rounded-xl">Search Address</Button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-1 gap-4">
                        {(stats?.levelStats || []).map((level: any) => (
                            <motion.div
                                key={level.level}
                                onClick={() => setSelectedLevel(selectedLevel === level.level ? null : level.level)}
                                className={`
                                    group h-24 relative overflow-hidden rounded-[2rem] border transition-all duration-500 cursor-pointer
                                    ${selectedLevel === level.level
                                        ? 'bg-emerald-500/[0.03] border-emerald-500/40 h-auto'
                                        : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                                    }
                                `}
                            >
                                <div className="h-24 px-8 flex items-center gap-10">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all">
                                        <div className="text-[8px] font-black text-white/20 leading-none mb-1">LV</div>
                                        <div className="text-lg font-black text-white leading-none">{level.level}</div>
                                    </div>

                                    <div className="flex-1 grid grid-cols-3 gap-10">
                                        <div>
                                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Members</div>
                                            <div className="text-xl font-black text-white italic">{level.members}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Active Status</div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-10 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${level.members > 0 ? (level.active / level.members) * 100 : 0}%` }} />
                                                </div>
                                                <div className="text-xs font-bold text-emerald-400">{level.members > 0 ? Math.round((level.active / level.members) * 100) : 0}%</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Rewards Credited</div>
                                            <div className="text-xl font-black text-emerald-400 italic">${(level.totalEarned || 0).toFixed(2)}</div>
                                        </div>
                                    </div>

                                    <div className={`transition-transform duration-500 ${selectedLevel === level.level ? 'rotate-90' : ''}`}>
                                        <ChevronRight className="h-5 w-5 text-white/10" />
                                    </div>
                                </div>

                                {selectedLevel === level.level && (
                                    <div className="px-10 pb-10 pt-4 border-t border-white/5 space-y-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {level.level === 1 && stats?.level1Details ? (
                                                stats.level1Details.map((member: any, i: number) => (
                                                    <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4 group/item hover:bg-white/5 transition-all">
                                                        <div className={cn(
                                                            "h-10 w-10 rounded-full flex items-center justify-center text-[10px] font-black",
                                                            member.active ? "bg-emerald-500/20 text-emerald-500" : "bg-white/5 text-white/20"
                                                        )}>
                                                            {member.active ? <Zap className="h-4 w-4" /> : "OFF"}
                                                        </div>
                                                        <div>
                                                            <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">{member.address}</div>
                                                            <div className="text-xs font-bold text-white tracking-widest italic">{member.tier === 'none' ? 'Not Active' : member.tier.toUpperCase()}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-4 py-8 text-center text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                                                    Deep Structure Access Unlocked via Tier 2
                                                </div>
                                            )}
                                        </div>
                                        {level.level === 1 && stats?.level1Details?.length > 0 && (
                                            <div className="text-center">
                                                <button className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] hover:scale-110 transition-transform">Explore Entire Tier {level.level} Network</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
