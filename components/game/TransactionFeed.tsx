"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/components/providers/Web3Provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Activity, ExternalLink, UserPlus, Trophy, CirclePlay } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveItem {
    id: string;
    type: 'ENTRY' | 'WIN' | 'REGISTRATION' | 'LUCKY_DRAW';
    user: string;
    amount?: string | number;
    prediction?: string;
    isCash?: boolean;
    timestamp: string;
}

export function TransactionFeed() {
    const socket = useSocket();
    const [activities, setActivities] = useState<LiveItem[]>([]);

    useEffect(() => {
        if (!socket) return;

        const handleActivity = (data: any) => {
            console.log("Live Event Received:", data);
            const newItem: LiveItem = {
                id: Math.random().toString(36).substring(7),
                ...data
            };

            setActivities(prev => [newItem, ...prev].slice(0, 30));
        };

        socket.on("live_activity", handleActivity);

        return () => {
            socket.off("live_activity", handleActivity);
        };
    }, [socket]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'ENTRY': return <CirclePlay className="h-3 w-3 text-blue-400" />;
            case 'WIN': return <Trophy className="h-3 w-3 text-green-400" />;
            case 'REGISTRATION': return <UserPlus className="h-3 w-3 text-purple-400" />;
            case 'LUCKY_DRAW': return <Trophy className="h-3 w-3 text-yellow-400" />;
            default: return <Activity className="h-3 w-3 text-muted-foreground" />;
        }
    };

    return (
        <Card className="h-full border-white/5 bg-black/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 animate-pulse text-green-500" />
                        Real-Time Activity
                    </div>
                    <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">
                        LIVE
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                {activities.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3 opacity-20" />
                        <p className="text-muted-foreground text-xs">Waiting for blockchain events...</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                        {activities.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-md bg-white/5">
                                        {getIcon(item.type)}
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-mono text-primary/80">
                                                {item.user ? `${item.user.slice(0, 6)}...${item.user.slice(-4)}` : 'System_Node'}
                                            </span>
                                            {item.user && (
                                                <a
                                                    href={`https://bscscan.com/address/${item.user}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="opacity-20 hover:opacity-100 transition-opacity"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {item.type === 'ENTRY' && `Participated in #${item.prediction || '?'}`}
                                            {item.type === 'WIN' && `Won ${item.amount || '0'} SC!`}
                                            {item.type === 'REGISTRATION' && `Joined the TRK ecosystem`}
                                            {item.type === 'LUCKY_DRAW' && `Won Lucky Draw: ${item.amount || '0'} SC!`}
                                        </div>
                                    </div>
                                </div>

                                {item.amount && (
                                    <div className="text-right">
                                        <div className={cn(
                                            "text-xs font-bold font-mono",
                                            item.type === 'WIN' || item.type === 'LUCKY_DRAW' ? "text-green-400" : "text-white"
                                        )}>
                                            {item.type === 'ENTRY' ? '-' : '+'}{item.amount}
                                        </div>
                                        <div className="text-[9px] text-muted-foreground/60">
                                            SC
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
