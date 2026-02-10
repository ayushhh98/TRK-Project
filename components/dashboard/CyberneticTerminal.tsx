"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu, Wifi, Activity, Play, ShieldAlert, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface LogEntry {
    id: string;
    timestamp: string;
    type: 'system' | 'network' | 'user' | 'warning' | 'success';
    message: string;
}

import { useSocket } from "@/components/providers/Web3Provider";

export function CyberneticTerminal() {
    const socket = useSocket();
    const [logs, setLogs] = useState<LogEntry[]>([
        { id: '1', timestamp: 'init', type: 'system', message: 'Initializing TRK_OS v2.4.0...' },
        { id: '2', timestamp: 'network', type: 'network', message: 'Connecting to On-Chain Event Stream...' },
    ]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'LIVE' | 'SYSTEM' | 'NET'>('LIVE');

    const addLog = (type: LogEntry['type'], message: string, time?: string) => {
        setLogs(prev => [...prev.slice(-49), {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: time || new Date().toLocaleTimeString('en-US', { hour12: false }),
            type,
            message
        }]);
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // Real-Time Socket Events
    useEffect(() => {
        if (!socket) return;

        const handleLiveActivity = (data: any) => {
            const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            let message = "";
            let type: LogEntry['type'] = 'system';

            switch (data.type) {
                case 'BET':
                    type = 'network';
                    message = `Incoming Bet: ${parseFloat(data.amount).toFixed(2)} USDT on #${data.prediction} by ${data.user.slice(0, 6)}...${data.user.slice(-4)}`;
                    break;
                case 'WIN':
                    type = 'success';
                    message = `Payout Verified: ${parseFloat(data.amount).toFixed(2)} USDT to ${data.user.slice(0, 6)}...${data.user.slice(-4)}`;
                    break;
                case 'REGISTRATION':
                    type = 'user';
                    message = `New Node Verified: ${data.user.slice(0, 6)}...${data.user.slice(-4)} joined the network.`;
                    break;
                case 'LUCKY_DRAW':
                    type = 'warning';
                    message = `JACKPOT ALERT: ${parseFloat(data.amount).toFixed(2)} USDT won by ${data.user.slice(0, 6)}...${data.user.slice(-4)}`;
                    break;
                default:
                    message = `Unknown Event: ${JSON.stringify(data)}`;
            }

            addLog(type, message, time);
        };

        const handleChatMessage = (data: any) => {
            const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            addLog('user', `[PEER_UPLINK] ${data.user.slice(0, 6)}: ${data.text}`, time);
        };

        socket.on('live_activity', handleLiveActivity);
        socket.on('chat_message', handleChatMessage);

        // Connection status logs
        socket.on('connect', () => {
            addLog('success', 'Secure Uplink Established (Socket.IO)');
        });

        socket.on('disconnect', () => {
            addLog('warning', 'Uplink Lost. Attempting Reconnection...');
        });

        return () => {
            socket.off('live_activity', handleLiveActivity);
            socket.off('chat_message', handleChatMessage);
            socket.off('connect');
            socket.off('disconnect');
        };
    }, [socket]);

    const handleCommand = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const cmd = input.trim().toLowerCase();
        addLog('user', `> ${input}`);

        // Basic Command Parsing
        if (cmd === '/clear') {
            setLogs([]);
        } else if (cmd === '/status') {
            addLog('system', 'System Integrity: 100%');
            addLog('system', 'Uptime: 42h 12m');
        } else if (cmd.startsWith('/msg ')) {
            const text = input.slice(5).trim();
            if (text && socket) {
                socket.emit('send_chat', { text });
                // We'll see our own message through the broadcast if the server supports it,
                // or we add it locally for instant feedback if not.
                // addLog('user', `[YOU]: ${text}`);
            }
        } else if (cmd === '/help') {
            addLog('system', 'Available commands: /clear, /status, /msg <text>, /help');
        } else {
            addLog('warning', `Unknown command: ${cmd}`);
        }

        setInput("");
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-full flex flex-col bg-black/95 border border-primary/20 rounded-[2.5rem] overflow-hidden relative group font-mono text-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-all duration-500 hover:border-primary/40"
        >
            {/* Scanlines Overlay */}
            <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20" />

            {/* Header / Tabs */}
            <div className="flex items-center justify-between px-6  py-4 bg-white/5 border-b border-white/10 relative z-30">
                <div className="flex items-center gap-4">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-primary animate-pulse" />
                        <div>
                            <div className="text-primary font-black tracking-[0.2em] text-[10px] uppercase">TRK_CORE_TERMINAL</div>
                            <div className="text-[8px] text-white/20 font-mono tracking-widest uppercase">SYSLOG_STREAM.V2.4.0</div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5">
                    {(['LIVE', 'SYSTEM', 'NET'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                activeTab === tab
                                    ? "bg-primary text-black shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Log Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-2 relative z-10 scrollbar-hide"
            >
                <AnimatePresence initial={false}>
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-3 text-xs md:text-sm group/log"
                        >
                            <span className="text-white/30 shrink-0 font-mono select-none w-14">{log.timestamp}</span>

                            <span className={cn(
                                "shrink-0 font-bold",
                                log.type === 'system' && "text-blue-400",
                                log.type === 'network' && "text-purple-400",
                                log.type === 'user' && "text-white",
                                log.type === 'success' && "text-green-400",
                                log.type === 'warning' && "text-orange-400",
                            )}>
                                [{log.type.toUpperCase()}]
                            </span>

                            <span className={cn(
                                "text-white/70 group-hover/log:text-white transition-colors break-all",
                                log.type === 'warning' && "text-orange-300",
                                log.type === 'success' && "text-green-300",
                            )}>
                                {log.message}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Blinking Cursor at bottom */}
                <div className="flex items-center gap-2 text-primary animate-pulse mt-4">
                    <span>_</span>
                </div>
            </div>

            {/* Input Area */}
            <div className="flex items-center gap-2 px-6 py-4 border-t border-white/10 bg-black/60 relative z-30">
                <span className="text-primary font-bold pointer-events-none">{">"}</span>
                <form onSubmit={handleCommand} className="flex-1">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type command (/help)..."
                        className="w-full bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-white/20"
                    />
                </form>
                <div className="text-[9px] text-emerald-500/40 font-mono uppercase tracking-[0.2em] hidden md:block">
                    PROT_AL_L3 // VRF_VERIFIED_SEQ
                </div>
            </div>
        </motion.div>
    );
}
