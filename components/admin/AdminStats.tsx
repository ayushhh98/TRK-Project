"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Users, DollarSign, Activity, Server, ShieldAlert } from "lucide-react";
import { adminAPI } from "@/lib/api";
import { useSocket } from "@/components/providers/Web3Provider";
import { cn } from "@/lib/utils";

interface AnalyticsData {
    totalUsers: number;
    totalGames: number;
    bannedUsers: number;
    totalWagered: number;
    totalPayout: number;
    houseEdge: number;
}

interface SystemStatus {
    database: string;
    uptime: number;
    realMoneyEnabled: boolean;
    version: string;
}

export function AdminStats() {
    const socket = useSocket();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [analyticsRes, statusRes] = await Promise.all([
                adminAPI.getAnalytics(),
                adminAPI.getSystemStatus()
            ]);

            if (analyticsRes.status === 'success') setAnalytics(analyticsRes.data);
            if (statusRes.status === 'success') setStatus(statusRes.data);
        } catch (error) {
            console.error("Failed to fetch admin stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Real-time listeners
        if (socket) {
            socket.on("admin_stats_update", (data: any) => {
                setAnalytics(prev => ({ ...prev, ...data }));
            });

            socket.on("user_registered", () => {
                setAnalytics(prev => prev ? ({ ...prev, totalUsers: prev.totalUsers + 1 }) : null);
            });
        }

        return () => {
            if (socket) {
                socket.off("admin_stats_update");
                socket.off("user_registered");
            }
        };
    }, [socket]);

    // Fallback polling for near real-time data
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-white/5 rounded-2xl" />
            ))}
        </div>;
    }

    const stats = [
        {
            title: "Total Users",
            value: analytics?.totalUsers.toLocaleString() || "0",
            icon: Users,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
            sub: `${analytics?.bannedUsers} restricted`
        },
        {
            title: "Total Wagered",
            value: `$${analytics?.totalWagered.toLocaleString() || "0"}`,
            icon: DollarSign,
            color: "text-green-400",
            bg: "bg-green-400/10",
            sub: `Edge: $${analytics?.houseEdge.toLocaleString()}`
        },
        {
            title: "Total Games",
            value: analytics?.totalGames.toLocaleString() || "0",
            icon: Activity,
            color: "text-purple-400",
            bg: "bg-purple-400/10",
            sub: "All-time rounds"
        },
        {
            title: "System Status",
            value: status?.database === 'connected' ? "Operational" : "Issues Detected",
            icon: status?.database === 'connected' ? Server : ShieldAlert,
            color: status?.database === 'connected' ? "text-emerald-400" : "text-red-400",
            bg: status?.database === 'connected' ? "bg-emerald-400/10" : "bg-red-400/10",
            sub: `v${status?.version} | Uptime: ${((status?.uptime || 0) / 3600).toFixed(1)}h`
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden relative">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            {stat.title}
                        </CardTitle>
                        <div className={cn("p-2 rounded-full", stat.bg)}>
                            <stat.icon className={cn("h-4 w-4", stat.color)} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-white">
                            {stat.value}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stat.sub}
                        </p>
                    </CardContent>

                    {/* Decorative gradient */}
                    <div className={cn(
                        "absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none",
                        stat.color.replace('text-', 'bg-')
                    )} />
                </Card>
            ))}
        </div>
    );
}

