"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    ArrowLeft, Trophy, Users, Zap, CheckCircle2,
    TrendingUp, Target, Award, Star, Shield,
    ArrowUpRight, Info, BarChart3, PieChart
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

// Rank Structure Configuration
const rankStructure = [
    { id: 'Rank 1', name: 'Bronze Director', pool: '2%', target: 10000, color: 'stone' },
    { id: 'Rank 2', name: 'Silver Director', pool: '2%', target: 50000, color: 'blue' },
    { id: 'Rank 3', name: 'Gold Director', pool: '1%', target: 250000, color: 'amber' },
    { id: 'Rank 4', name: 'Platinum Director', pool: '1%', target: 1000000, color: 'emerald' },
    { id: 'Rank 5', name: 'Diamond Director', pool: '1%', target: 5000000, color: 'indigo' },
    { id: 'Rank 6', name: 'Crown Ambassador', pool: '1%', target: 10000000, color: 'purple' },
];

export default function ClubIncPage() {
    const { address, user } = useWallet();

    // Mock Club Data
    const clubData = {
        currentRank: { id: 'Rank 1', name: 'Bronze Director' },
        totalTurnover: 1250000,
        poolPercentage: '8%',
        dailyPoolAmount: 100000,
        earningsToday: 156.40,
        totalEarned: 2450.80,
        strongLegVolume: 12500,
        otherLegsVolume: 8400,
        totalTeamVolume: 20900,
        nextRank: {
            id: 'Rank 2',
            name: 'Silver Director',
            target: 50000,
            strongLegReq: 25000,
            otherLegsReq: 25000
        }
    };

    const strongLegProgress = Math.min((clubData.strongLegVolume / (clubData.nextRank?.strongLegReq || 1)) * 100, 100);
    const otherLegsProgress = Math.min((clubData.otherLegsVolume / (clubData.nextRank?.otherLegsReq || 1)) * 100, 100);

    return (
        <div className="min-h-screen bg-background pb-32 selection:bg-amber-500/30">
            {/* Cinematic Header */}
            <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-50">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/dashboard" className="group flex items-center gap-3 text-white/40 hover:text-white transition-all duration-300">
                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black group-hover:scale-110 transition-all">
                            <ArrowLeft className="h-5 w-5" />
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-amber-500/60">Ecosystem</div>
                            <div className="text-sm font-bold">Leadership Control</div>
                        </div>
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="h-12 flex items-center gap-3 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Global Turnover Share Active</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 lg:py-20 space-y-24">
                {/* Hero Section */}
                <div className="relative">
                    {/* Prestigious Background FX */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/5 blur-[120px] opacity-30 pointer-events-none" />

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-10 relative z-10"
                    >
                        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/5 border border-amber-500/10 text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] backdrop-blur-3xl">
                            <Award className="h-4 w-4" />
                            Elite Leadership Pool
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-6xl md:text-9xl font-display font-black italic uppercase tracking-tighter text-white">
                                Club <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-500 to-amber-700 drop-shadow-[0_0_50px_rgba(245,158,11,0.3)]">Income</span>
                            </h1>
                            <p className="text-white/40 max-w-2xl mx-auto uppercase tracking-widest text-xs md:text-sm font-medium leading-relaxed">
                                Earn a share of total company turnover (8% pool).
                                <br />
                                <span className="text-amber-400/80 font-black">Reserved for those who lead the ecosystem.</span>
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {[
                                { label: 'Daily Pool', value: `$${clubData.dailyPoolAmount.toLocaleString('en-US')}`, sub: '8% TURNOVER POOL', icon: Zap, color: 'amber' },
                                { label: 'Your Rank', value: clubData.currentRank.name, sub: 'LEADERSHIP STATUS', icon: Trophy, color: 'blue' },
                                { label: 'Today\'s Share', value: `$${clubData.earningsToday.toLocaleString('en-US')}`, sub: 'DISTRIBUTED DAILY', icon: TrendingUp, color: 'green' }
                            ].map((stat, i) => (
                                <Card key={i} className="border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] overflow-hidden group hover:border-amber-500/20 transition-all duration-500">
                                    <CardContent className="p-8 space-y-4 text-center">
                                        <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/20 group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-all duration-500 group-hover:scale-110">
                                            <stat.icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">{stat.label}</div>
                                            <div className="text-2xl font-black text-white italic tracking-tight">{stat.value}</div>
                                            <div className="text-[9px] font-bold text-amber-500/40 uppercase tracking-widest mt-1">{stat.sub}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Qualification & Balanced Leg Control */}
                <div className="grid lg:grid-cols-12 gap-10 items-start">
                    {/* Left: Progress Gauges */}
                    <div className="lg:col-span-12">
                        <Card className="border-white/5 bg-white/[0.01] backdrop-blur-3xl rounded-[4rem] overflow-hidden p-12">
                            <div className="grid lg:grid-cols-2 gap-20 items-center">
                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-[0.3em]">
                                            <Shield className="h-4 w-4" />
                                            Balanced Leg Rule (50/50)
                                        </div>
                                        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                                            Qualification <span className="text-white/20">Status</span>
                                        </h2>
                                        <p className="text-sm text-white/40 leading-relaxed uppercase tracking-widest">
                                            To reach <span className="text-white font-bold">{clubData.nextRank.name}</span>, you must build balanced volume:
                                            50% from your strongest leg and 50% from all other combined legs.
                                        </p>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Strong Leg */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Strongest Team Leg</div>
                                                    <div className="text-xl font-black text-white">${clubData.strongLegVolume.toLocaleString('en-US')}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Target Contribution</div>
                                                    <div className="text-sm font-black text-white/40">${clubData.nextRank.strongLegReq.toLocaleString('en-US')}</div>
                                                </div>
                                            </div>
                                            <div className="h-4 bg-white/5 rounded-full p-1 border border-white/10 overflow-hidden relative">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${strongLegProgress}%` }}
                                                    className="h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-full relative shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                                                >
                                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                                                </motion.div>
                                            </div>
                                        </div>

                                        {/* Other Legs */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Combined Other Legs</div>
                                                    <div className="text-xl font-black text-white">${clubData.otherLegsVolume.toLocaleString('en-US')}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-black text-green-500 uppercase tracking-widest">Target Contribution</div>
                                                    <div className="text-sm font-black text-white/40">${clubData.nextRank.otherLegsReq.toLocaleString('en-US')}</div>
                                                </div>
                                            </div>
                                            <div className="h-4 bg-white/5 rounded-full p-1 border border-white/10 overflow-hidden relative">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${otherLegsProgress}%` }}
                                                    className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full relative shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                                                >
                                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                                                </motion.div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative aspect-square flex items-center justify-center">
                                    {/* Central Gauge Overlay */}
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/5 to-transparent border border-white/5 blur-3xl" />
                                    <div className="relative z-10 text-center space-y-4">
                                        <div className="h-40 w-40 rounded-full bg-black/40 border border-amber-500/20 flex flex-col items-center justify-center p-8 backdrop-blur-3xl shadow-[0_0_100px_rgba(245,158,11,0.2)]">
                                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-2">Total Team</div>
                                            <div className="text-4xl font-black text-white tracking-tighter italic">20K</div>
                                            <div className="text-[9px] font-bold text-amber-500 uppercase mt-1">USD Volume</div>
                                        </div>
                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">
                                            Goal: ${clubData.nextRank.target.toLocaleString('en-US')}
                                        </div>
                                    </div>
                                    {/* Animated Ring (In real SVG implementation) */}
                                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                                        <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                                        <motion.circle
                                            cx="50%" cy="50%" r="45%" fill="none"
                                            stroke="url(#amberGradient)" strokeWidth="12"
                                            strokeDasharray="100 100" strokeDashoffset="50"
                                            strokeLinecap="round"
                                        />
                                        <defs>
                                            <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#f59e0b" />
                                                <stop offset="100%" stopColor="#d97706" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Rank Table & Prestige Section */}
                    <div className="lg:col-span-12 space-y-12">
                        <div className="flex items-center justify-between px-10">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Ecosystem Ranks</h3>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Climb the ladder of success</p>
                            </div>
                            <Link href="/referral" className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center justify-center transition-all group">
                                <span className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest leading-none">
                                    View Organization <ArrowUpRight className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </span>
                            </Link>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rankStructure.map((rank, i) => (
                                <Card key={i} className={`border-white/5 bg-white/[0.01] backdrop-blur-3xl rounded-[3rem] overflow-hidden group hover:bg-amber-500/[0.03] transition-all duration-500 ${clubData.currentRank.id === rank.id ? 'border-amber-500/30 bg-amber-500/[0.02]' : ''}`}>
                                    <CardContent className="p-8 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className={`h-16 w-16 rounded-2xl bg-${rank.color}-500/10 border border-${rank.color}-500/20 flex items-center justify-center text-${rank.color}-400 group-hover:scale-110 transition-transform`}>
                                                <Trophy className="h-8 w-8" />
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Pool Share</div>
                                                <div className={`text-2xl font-black text-${rank.color}-400 italic`}>{rank.pool}</div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Position</div>
                                                <div className="text-xl font-bold text-white tracking-tight">{rank.name}</div>
                                            </div>
                                            <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                                                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest text-center flex-1">
                                                    Target
                                                    <span className="block text-sm text-white/60 font-mono mt-0.5">${rank.target.toLocaleString('en-US')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {clubData.totalTeamVolume >= rank.target ? (
                                            <div className="flex items-center justify-center gap-2 text-green-500 bg-green-500/10 py-3 rounded-2xl border border-green-500/20 text-[10px] font-black uppercase tracking-widest">
                                                <CheckCircle2 className="h-4 w-4" /> Qualified
                                            </div>
                                        ) : rank.id === clubData.nextRank.id ? (
                                            <div className="flex items-center justify-center gap-2 text-amber-500 bg-amber-500/10 py-3 rounded-2xl border border-amber-500/20 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                Current Goal
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 text-white/10 bg-white/5 py-3 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest">
                                                <Lock className="h-3.5 w-3.5" /> Locked
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Additional Components needed for standard icons
function Lock({ className }: { className?: string }) {
    return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
