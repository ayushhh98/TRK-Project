"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu, Wifi, Activity, Play, ShieldAlert, Command, ShieldCheck, Zap, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useSocket } from "@/components/providers/Web3Provider";

interface LogEntry {
    id: string;
    timestamp: string;
    type: 'system' | 'network' | 'user' | 'warning' | 'success';
    message: string;
}

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

        if (cmd === '/clear') {
            setLogs([]);
        } else if (cmd === '/status') {
            addLog('system', 'System Integrity: 100%');
            addLog('system', 'Uptime: 42h 12m');
        } else if (cmd.startsWith('/msg ')) {
            const text = input.slice(5).trim();
            if (text && socket) {
                socket.emit('send_chat', { text });
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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full flex flex-col bg-black border border-white/10 rounded-[2.5rem] overflow-hidden relative group font-mono text-sm shadow-2xl transition-all duration-500 hover:border-blue-500/30"
        >
            {/* Background Grain & Scanlines */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] opacity-40 group-hover:opacity-60 transition-opacity" />

            {/* Subtle Screen Flicker Effect */}
            <div className="absolute inset-0 pointer-events-none z-20 bg-blue-500/[0.01] animate-pulse" />

            {/* Header / Tabs */}
            <div className="flex items-center justify-between px-8 py-5 bg-white/[0.02] border-b border-white/5 relative z-30">
                <div className="flex items-center gap-5">
                    <div className="flex gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/40 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    </div>

                    <div className="h-4 w-px bg-white/10" />

                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Terminal className="w-4 h-4 text-blue-400 group-hover:animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-black tracking-[0.15em] text-[11px] uppercase">TRK_CORE_TERMINAL</span>
                                <span className="px-1.5 py-0.5 rounded-sm bg-blue-500/10 border border-blue-500/20 text-[8px] font-black text-blue-400 uppercase tracking-widest animate-pulse">
                                    Active_Link
                                </span>
                            </div>
                            <div className="text-[9px] text-white/30 font-mono tracking-widest uppercase mt-0.5 flex items-center gap-2">
                                <Globe className="h-2 w-2" /> Node: Mainnet_Sec_04
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/10">
                    {(['LIVE', 'SYSTEM', 'NET'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                                activeTab === tab
                                    ? "bg-white text-black shadow-lg scale-[1.02]"
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
                className="flex-1 overflow-y-auto p-8 space-y-3 relative z-10 scrollbar-hide bg-[rgba(0,0,0,0.2)]"
            >
                <AnimatePresence initial={false}>
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                            className="flex items-start gap-4 text-xs group/log"
                        >
                            <span className="text-white/20 shrink-0 font-mono select-none w-14 text-[10px] mt-0.5">[{log.timestamp}]</span>

                            <div className="flex flex-col gap-1 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border",
                                        log.type === 'system' && "text-blue-400 bg-blue-500/10 border-blue-500/20",
                                        log.type === 'network' && "text-purple-400 bg-purple-500/10 border-purple-500/20",
                                        log.type === 'user' && "text-white bg-white/10 border-white/20",
                                        log.type === 'success' && "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                                        log.type === 'warning' && "text-amber-400 bg-amber-500/10 border-amber-500/20",
                                    )}>
                                        {log.type}
                                    </span>
                                </div>
                                <span className={cn(
                                    "text-white/60 group-hover/log:text-white leading-relaxed font-medium transition-colors",
                                    log.type === 'warning' && "text-amber-200/70",
                                    log.type === 'success' && "text-emerald-200/70",
                                )}>
                                    {log.message}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Blinking Cursor at bottom */}
                <div className="flex items-center gap-2 text-blue-400 mt-6 pl-1">
                    <div className="h-4 w-2 bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Awaiting_Input...</span>
                </div>
            </div>

            {/* Input Area */}
            <div className="px-8 py-5 border-t border-white/5 bg-white/[0.01] relative z-30 group/input">
                <div className="flex items-center gap-3">
                    <span className="text-blue-400 font-black group-hover/input:animate-pulse">_</span>
                    <form onSubmit={handleCommand} className="flex-1">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="CMD:// type command or /help"
                            className="w-full bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-white/10 tracking-wide"
                        />
                    </form>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[8px] text-emerald-500/40 font-black uppercase tracking-[0.25em]">PROT_AL_L3</span>
                            <span className="text-[7px] text-white/10 font-mono uppercase tracking-widest">VRF_VERIFIED_SEQ</span>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                            <Command className="h-3 w-3 text-white/40" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="px-8 py-2 bg-blue-500/[0.02] border-t border-white/[0.02] flex items-center justify-between z-30">
                <div className="flex items-center gap-4 text-[7px] font-black uppercase tracking-[0.3em] text-white/20">
                    <span className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-blue-500/40" />
                        Uplink_Stat: Nominal
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-500/30">
                        <ShieldAlert className="h-2 w-2" />
                        Auth: ZKP_Verified
                    </span>
                </div>
                <div className="text-[7px] text-white/10 font-mono">
                    COORD: [42.6, 12.4, 9.8]
                </div>
            </div>
        </motion.div>
    );
}
