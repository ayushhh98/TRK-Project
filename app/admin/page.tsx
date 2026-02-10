"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { Footer } from "@/components/layout/Footer";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { AdminLiveFeed } from "@/components/admin/AdminLiveFeed";
import { UserTable } from "@/components/admin/UserTable";
import {
    ShieldCheck,
    AlertTriangle,
    Crown,
    Activity
} from "lucide-react";

export default function AdminPage() {
    const router = useRouter();
    const { user, isLoading } = useWallet();
    const [isBusy, setIsBusy] = useState(false);

    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            router.push("/admin/login");
            return;
        }
        if (!isAdmin) {
            router.push("/admin/login?reason=unauthorized");
        }
    }, [isLoading, user, isAdmin, router]);

    if (!isAdmin && !isLoading) {
        return (
            <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center p-6">
                <Card className="max-w-lg w-full bg-black/50 border border-white/10 rounded-[2rem]">
                    <CardContent className="p-10 text-center space-y-4">
                        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                        <h1 className="text-2xl font-display font-black">Access Denied</h1>
                        <p className="text-sm text-white/50">
                            This route is restricted to administrators.
                        </p>
                        <Link href="/dashboard">
                            <Button className="mt-4">Return to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020202] text-white flex flex-col">
            <AdminNavbar />

            <main className="flex-1 w-full px-6 md:px-10 py-12 space-y-10">

                {/* Admin Poster - Enhanced Visualization */}
                <div className="relative rounded-[2.5rem] overflow-hidden bg-black border border-white/10 shadow-2xl">
                    {/* Dynamic Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-black to-black" />
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="space-y-6 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-widest uppercase">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Admin Console v2.0
                            </div>

                            <h1 className="text-5xl md:text-6xl font-display font-black text-white leading-[1.1]">
                                Master Control <br />
                                <span className="text-emerald-500 italic">Interface</span>
                            </h1>

                            <p className="text-lg text-white/60 leading-relaxed">
                                Complete oversight of ecosystem health, user registry, and financial protocols.
                                Secure execution environment active.
                            </p>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <div className="h-12 px-8 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 text-white/70 font-bold text-sm">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    System Active
                                </div>
                            </div>
                        </div>

                        {/* Visual element for poster */}
                        <div className="relative hidden md:block">
                            <div className="h-64 w-64 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-transparent border border-emerald-500/30 flex items-center justify-center backdrop-blur-md rotate-3 hover:rotate-0 transition-transform duration-500">
                                <Crown className="h-32 w-32 text-emerald-500/80 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                            </div>
                            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center shadow-xl">
                                <Activity className="h-10 w-10 text-emerald-400 mb-2" />
                                <div className="text-xs font-black uppercase text-white/40">Uptime</div>
                                <div className="text-lg font-black text-white">99.9%</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <AdminStats />

                {/* Charts & Live Feed Row */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-6">
                        <AdminCharts />
                    </div>
                    <div className="xl:col-span-1">
                        <AdminLiveFeed />
                    </div>
                </div>

                {/* Users Table */}
                <UserTable />

            </main>

            <Footer />
        </div>
    );
}
