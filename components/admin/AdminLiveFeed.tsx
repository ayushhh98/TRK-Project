"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Activity, Gamepad2, Trophy, User } from "lucide-react";
import { useSocket } from "@/components/providers/Web3Provider";
import { adminAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

interface GameActivity {
    id: string;
    type: string; // 'bet', 'win', 'register'
    user: string;
    game: string;
    amount?: number;
    multiplier?: number;
    timestamp: Date;
}

export function AdminLiveFeed() {
    const socket = useSocket();
    const [feed, setFeed] = useState<GameActivity[]>([]);
    const isConnected = !!socket?.connected;

    useEffect(() => {
        // Initial load
        const loadInitial = async () => {
            const res = await adminAPI.getGames({ limit: 10 });
            if (res.status === 'success' && res.data.games) {
                const mapped: GameActivity[] = res.data.games.map((g: any) => ({
                    id: g._id,
                    type: g.isWin ? 'win' : 'bet',
                    user: g.user?.walletAddress || g.user?.email || 'Unknown',
                    game: g.gameVariant || g.gameType || 'Game',
                    amount: g.betAmount,
                    multiplier: g.multiplier,
                    timestamp: new Date(g.createdAt)
                }));
                setFeed(mapped);
            }
        };
        loadInitial();

        if (socket) {
            socket.on("live_activity", (data: any) => {
                const rawType = (data.type || data.eventType || 'bet').toString().toLowerCase();
                const normalizedType =
                    rawType.includes('win') || rawType.includes('payout') || rawType.includes('lucky')
                        ? 'win'
                        : rawType.includes('reg')
                            ? 'register'
                            : 'bet';
                const amountNum = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
                const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
                const userLabel = data.user || data.walletAddress || 'Unknown';
                const gameLabel = data.game || data.gameType || (normalizedType === 'register' ? 'Registration' : 'Game');

                const newItem: GameActivity = {
                    id: Math.random().toString(36).substr(2, 9),
                    type: normalizedType,
                    user: userLabel,
                    game: gameLabel,
                    amount: Number.isFinite(amountNum) ? amountNum : undefined,
                    multiplier: data.multiplier,
                    timestamp
                };
                setFeed(prev => [newItem, ...prev].slice(0, 50));
            });
        }

        return () => {
            if (socket) socket.off("live_activity");
        };
    }, [socket]);

    return (
        <Card className="h-[600px] flex flex-col bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex-none border-b border-white/5">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-500" />
                        Live Ledger
                    </span>
                    <span className="flex items-center gap-2 text-[10px] font-black text-white/40">
                        <span className={cn("relative flex h-2 w-2", isConnected ? "text-emerald-400" : "text-red-400")}>
                            <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", isConnected ? "animate-ping bg-emerald-400" : "bg-red-400")} />
                            <span className={cn("relative inline-flex rounded-full h-2 w-2", isConnected ? "bg-emerald-500" : "bg-red-500")} />
                        </span>
                        {isConnected ? "Live" : "Offline"}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {feed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-2">
                        <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                        <span className="text-xs uppercase tracking-widest">
                            {isConnected ? "Waiting for activity..." : "Disconnected"}
                        </span>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {feed.map((item) => (
                            <div key={item.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        item.type === 'win' ? "bg-yellow-500/10 text-yellow-500" :
                                            item.type === 'register' ? "bg-blue-500/10 text-blue-500" :
                                                "bg-white/5 text-white/50"
                                    )}>
                                        {item.type === 'win' ? <Trophy className="h-4 w-4" /> :
                                            item.type === 'register' ? <User className="h-4 w-4" /> :
                                                <Gamepad2 className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <div className="text-xs font-mono text-white/80">
                                            {item.user.length > 16 ? `${item.user.slice(0, 6)}...${item.user.slice(-4)}` : item.user}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                            {item.game} | {item.timestamp.toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {item.amount && (
                                        <div className={cn(
                                            "text-sm font-mono font-bold",
                                            item.type === 'win' ? "text-emerald-400" : "text-white/60"
                                        )}>
                                            {item.type === 'win' ? '+' : ''}${item.amount.toFixed(2)}
                                        </div>
                                    )}
                                    {item.multiplier && (
                                        <div className="text-[10px] text-purple-400 font-mono">
                                            {item.multiplier}x
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

