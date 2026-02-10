"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Users, Globe, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalPulse() {
    // Start with consistent initial values for server/client match (Hydration Fix)
    const [volume, setVolume] = useState(1245089.42);
    const [nodes, setNodes] = useState(842);
    const [lastSync, setLastSync] = useState(new Date());
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Randomize slightly on mount to look dynamic
        setVolume(prev => prev + (Math.random() * 5000));
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            // Simulate live growth
            setVolume(prev => prev + (Math.random() * 0.5));

            // Randomly fluctuate nodes
            if (Math.random() > 0.95) {
                setNodes(prev => prev + (Math.random() > 0.5 ? 1 : -1));
            }

            setLastSync(new Date());
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 p-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500/20 blur-xl animate-pulse" />
                        <Activity className="h-5 w-5 text-green-500 relative z-10" />
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Ecosystem Volume (Pulse)</div>
                    <div className="text-3xl font-black text-white font-mono flex items-baseline gap-2">
                        <span className="text-xs text-green-500 opacity-50">$</span>
                        {isMounted
                            ? volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : "1,245,089.42"
                        }
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="h-full w-1/3 bg-gradient-to-r from-transparent via-green-500 to-transparent"
                        />
                    </div>
                    <span className="text-[8px] font-mono text-green-500/60 whitespace-nowrap">EXTRACTING_DATA...</span>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 p-4">
                    <Globe className="h-5 w-5 text-blue-500 opacity-40 animate-spin-slow" />
                </div>

                <div className="space-y-1">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Synchronized Nodes</div>
                    <div className="text-3xl font-black text-white font-mono">
                        {nodes}
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-5 h-5 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center">
                                <Users className="h-2 w-2 text-zinc-400" />
                            </div>
                        ))}
                        <div className="w-5 h-5 rounded-full border-2 border-black bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                            +12
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500">
                        <Database className="h-3 w-3" />
                        UPTIME: 99.99%
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
