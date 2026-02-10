"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Zap, ShieldCheck, Crown, ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function PromoPoster() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative w-full overflow-hidden rounded-[2rem] bg-black border border-white/10 group"
        >
            {/* Animated Background Mesh */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.15),transparent_70%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0)_40%,rgba(124,58,237,0.1)_50%,rgba(0,0,0,0)_60%)] bg-[length:200%_200%] animate-[shimmer_6s_infinite_linear]" />

            {/* Tech Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:24px_24px] opacity-20" />

            {/* Content Container */}
            <div className="relative z-10 p-8 space-y-6">

                {/* Header Badge */}
                <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                        <Crown className="h-3 w-3" />
                        <span>System_Elite</span>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                </div>

                {/* Main Visual Text */}
                <div className="space-y-2">
                    <h3 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter leading-none drop-shadow-2xl">
                        Become The <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 animate-gradient-x">Protocol Owner</span>
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed font-medium">
                        Unlock governance rights, revenue sharing, and elite tier withdrawal limits.
                    </p>
                </div>

                {/* Benefits List */}
                <div className="space-y-3 pt-2">
                    {[
                        { icon: ShieldCheck, text: "Priority Withdrawal Channel" },
                        { icon: Zap, text: "Zero Fee Transactions" },
                        { icon: Lock, text: "Vault Access (Lvl 10)" },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs font-bold text-white/70 uppercase tracking-wide group/item">
                            <div className="p-1 rounded bg-white/5 group-hover/item:bg-purple-500/20 transition-colors">
                                <item.icon className="h-3 w-3 text-purple-400" />
                            </div>
                            {item.text}
                        </div>
                    ))}
                </div>

                {/* Call to Action */}
                <div className="pt-4">
                    <Button className="w-full h-12 bg-white text-black hover:bg-purple-50 text-xs font-black uppercase tracking-[0.2em] rounded-xl flex items-center justify-between px-6 group/btn shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all">
                        <span>Initialize Upgrade</span>
                        <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>

            {/* Decorative Cyber Lines */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            <div className="absolute top-10 -right-10 h-32 w-32 bg-purple-500/20 blur-[60px] rounded-full pointing-events-none" />
        </motion.div>
    );
}
