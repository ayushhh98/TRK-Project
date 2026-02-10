"use client";

import { motion } from "framer-motion";
import { Coins, Gift, Trophy, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function SweepstakesExplainer() {
    const steps = [
        {
            icon: Coins,
            title: "Get Gold Coins (GC)",
            desc: "Purchase a Membership Package to get Gold Coins. Use them to play for fun and practice your strategies risk-free.",
            color: "text-yellow-400",
            bg: "bg-yellow-400/10",
            border: "border-yellow-400/20"
        },
        {
            icon: Gift,
            title: "Get FREE Sweepstakes Coins (SC)",
            desc: "Every package includes FREE Sweepstakes Coins as a bonus! These are your key to promotional play.",
            color: "text-purple-400",
            bg: "bg-purple-400/10",
            border: "border-purple-400/20",
            badge: "BONUS INSIDE"
        },
        {
            icon: Zap,
            title: "Play Games (Win SC)",
            desc: "Switch to 'Promotional Play' mode. Use your SC to play games. Winnings are paid out in redeemable SC.",
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
            border: "border-emerald-400/20"
        },
        {
            icon: Trophy,
            title: "Redeem for Prizes",
            desc: " accumulated SC winnings can be redeemed for real crypto prizes! 1 SC value = 1 USDT.",
            color: "text-white",
            bg: "bg-gradient-to-br from-indigo-500/20 to-purple-500/20",
            border: "border-indigo-400/30"
        }
    ];

    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto text-center mb-16 space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-black tracking-widest uppercase"
                    >
                        <Gift className="h-4 w-4" />
                        Sweepstakes Model
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-display font-black text-white leading-tight"
                    >
                        How to Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Real Rewards</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-white/60 max-w-2xl mx-auto"
                    >
                        No purchase necessary to play. Unlock the full potential of our legal sweepstakes model in 4 simple steps.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-yellow-400/20 via-purple-400/20 to-indigo-400/20 dash-line" />

                    {steps.map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15 }}
                            className="relative group"
                        >
                            <div className={`h-full p-6 rounded-3xl bg-black/60 border ${step.border} backdrop-blur-xl relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]`}>
                                {/* Hover Glow */}
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 to-transparent`} />

                                {step.badge && (
                                    <div className="absolute top-4 right-4 px-2 py-1 rounded bg-gradient-to-r from-purple-600 to-indigo-600 text-[9px] font-black text-white uppercase tracking-widest shadow-lg">
                                        {step.badge}
                                    </div>
                                )}

                                <div className={`h-16 w-16 rounded-2xl ${step.bg} flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform duration-500`}>
                                    <step.icon className={`h-8 w-8 ${step.color}`} />
                                </div>

                                <div className="space-y-3 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/50">
                                            {i + 1}
                                        </div>
                                        <h3 className="text-lg font-bold text-white leading-tight">{step.title}</h3>
                                    </div>
                                    <p className="text-sm text-white/50 leading-relaxed">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="mt-16 text-center"
                >
                    <div className="inline-flex flex-col items-center gap-6 p-8 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 backdrop-blur-md max-w-2xl mx-auto">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-xs">
                            <ShieldCheck className="h-4 w-4" />
                            100% Legal & Compliant
                        </div>
                        <p className="text-white/80 text-lg font-medium">
                            Ready to start? Get your first package and claim your <span className="text-purple-400 font-bold">FREE SC</span> today.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                            <Link href="/login">
                                <Button size="lg" className="h-14 px-10 bg-white text-black hover:bg-white/90 font-black text-lg rounded-xl w-full sm:w-auto">
                                    Get Started
                                </Button>
                            </Link>
                            <Link href="/legal/sweepstakes">
                                <Button size="lg" variant="outline" className="h-14 px-10 border-white/10 text-white hover:bg-white/5 font-bold text-lg rounded-xl w-full sm:w-auto">
                                    Read Rules
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// Add styled JSX for the dashed line
const styles = `
.dash-line {
  background-image: linear-gradient(to right, rgba(255, 255, 255, 0.1) 50%, transparent 50%);
  background-size: 20px 100%;
}
`;

