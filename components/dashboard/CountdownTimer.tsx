"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownTimerProps {
    expiryDate: string | null;
}

export function CountdownTimer({ expiryDate }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState({ days: 30, hours: 0, minutes: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        // Default to a future date if no expiryDate is provided (e.g., 30 days from now)
        // This ensures the timer always has a valid target for the "practice" period.
        const targetDate = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const calculateTimeLeft = () => {
            const difference = +targetDate - +new Date();

            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                };
            }
            setIsExpired(true);
            return { days: 0, hours: 0, minutes: 0 };
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        setTimeLeft(calculateTimeLeft());

        return () => clearInterval(timer);
    }, [expiryDate]);

    return (
        <Card className="expirary relative overflow-hidden bg-black/90 backdrop-blur-xl border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)] group min-w-[300px]">
            {/* Holographic Background */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_linear_infinite]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:20px_20px] opacity-20" />

            {/* Scanning Line Animation */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-70 animate-[scan_3s_ease-in-out_infinite]" />

            <CardContent className="p-5 flex items-center justify-between gap-6 relative z-10">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-500/90">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] ml-5">
                            PRACTICE PERIOD
                        </span>
                    </div>

                    <div className="flex items-baseline gap-1">
                        <TimeUnit value={timeLeft.days} label="Day" />
                        <Separator />
                        <TimeUnit value={timeLeft.hours} label="Hr" />
                        <Separator />
                        <TimeUnit value={timeLeft.minutes} label="Min" />
                    </div>
                </div>

                <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                        {isExpired ? (
                            <AlertTriangle className="h-5 w-5 text-emerald-500 animate-[pulse_0.5s_ease-in-out_infinite]" />
                        ) : (
                            <span className="text-[10px] font-black text-emerald-500 animate-[pulse_2s_ease-in-out_infinite]">EXP</span>
                        )}
                        <div className="absolute inset-0 bg-emerald-500/20 blur-xl animate-pulse" />
                    </div>
                </div>
            </CardContent>

            {/* Corner Accents */}
            <div className="absolute top-0 right-0 p-2 opacity-20">
                <div className="w-16 h-16 border-t-2 border-r-2 border-emerald-500 rounded-tr-3xl" />
            </div>
            <div className="absolute bottom-0 left-0 p-2 opacity-20">
                <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-500 rounded-bl-xl" />
            </div>
        </Card>
    );
}

function TimeUnit({ value, label }: { value: number, label: string }) {
    return (
        <div className="flex flex-col items-center min-w-[2.5rem]">
            <div className="relative">
                <span className="text-2xl font-mono font-black text-white tabular-nums tracking-tight relative z-10 block">
                    {String(value).padStart(2, '0')}
                </span>
                {/* Glitch Shadow */}
                <span className="text-2xl font-mono font-black text-emerald-500/50 tabular-nums tracking-tight absolute inset-0 translate-x-[1px] translate-y-[0px] blur-[1px] animate-pulse">
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span className="text-[8px] uppercase text-white/40 font-bold tracking-wider">{label}</span>
        </div>
    );
}

function Separator() {
    return (
        <span className="text-emerald-500/50 font-mono text-xl animate-pulse relative -top-3">:</span>
    );
}
