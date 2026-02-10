"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Disc, Trophy, Disc as DiscIcon, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/components/providers/WalletProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Segments matching backend prizes
// Backend: 1sc, 2sc, 5sc, 10sc, 50gc, 100gc, empty
const SEGMENTS = [
    { id: '1sc', label: '1 SC', color: 'bg-yellow-400', textColor: 'text-yellow-400', value: '1sc' },
    { id: '50gc', label: '50 GC', color: 'bg-green-500', textColor: 'text-green-500', value: '50gc' },
    { id: '2sc', label: '2 SC', color: 'bg-gray-300', textColor: 'text-gray-300', value: '2sc' },
    { id: 'empty', label: 'Try Again', color: 'bg-red-500', textColor: 'text-red-500', value: 'empty' },
    { id: '5sc', label: '5 SC', color: 'bg-orange-500', textColor: 'text-orange-500', value: '5sc' },
    { id: '100gc', label: '100 GC', color: 'bg-cyan-500', textColor: 'text-cyan-500', value: '100gc' },
    { id: '10sc', label: '10 SC', color: 'bg-white', textColor: 'text-white', value: '10sc' },
    { id: 'empty_2', label: 'Try Again', color: 'bg-red-500', textColor: 'text-red-500', value: 'empty' },
];

export function NeonSpin() {
    const { token, refreshUser, user } = useWallet();
    const router = useRouter();

    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState<any | null>(null);

    const spinWheel = async () => {
        if (isSpinning) return;
        if (!token) {
            toast.error("Please connect your wallet");
            return;
        }

        const SPIN_COST = 50;
        if ((user?.credits || 0) < SPIN_COST) {
            toast.error("Insufficient Credits (GC)", {
                description: "You need 50 GC to spin. Play more games or claim daily rewards!"
            });
            return;
        }

        setIsSpinning(true);
        setResult(null);
        const toastId = toast.loading("Initiating Spin Sequence...");

        try {
            const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
            const res = await fetch(`${apiBase}/api/game/spin-wheel`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            }).then(r => r.json());

            if (res.status !== 'success') {
                throw new Error(res.message || "Spin failed");
            }

            toast.dismiss(toastId);
            const { prize } = res.data;

            // Find segment index
            // We need to match the backend prize ID to our segment array
            // Backend IDs: 1sc, 2sc, 5sc, 10sc, 50gc, 100gc, empty
            // Our Segments have IDs that might duplicate 'empty'

            let targetIndex = -1;

            // Simple robust finding: find first matching segment
            // Improve randomness by picking random matching segment if duplicates exist
            const matchingIndices = SEGMENTS.map((s, i) => s.value === prize.id ? i : -1).filter(i => i !== -1);

            if (matchingIndices.length > 0) {
                targetIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
            } else {
                // Fallback to 0 if something is weird
                targetIndex = 0;
            }

            // Calculate Rotation
            const segmentAngle = 360 / SEGMENTS.length;
            // Align to center of segment
            const offset = segmentAngle / 2;
            const targetRotation = (SEGMENTS.length - targetIndex) * segmentAngle - offset;

            // Add extra spins (5 full rotations)
            const newRotation = rotation + 1800 + targetRotation - (rotation % 360);
            setRotation(newRotation);

            setTimeout(async () => {
                setIsSpinning(false);
                setResult(res.data);
                if (prize.type !== 'none') {
                    toast.success(res.data.message);
                } else {
                    toast.info(res.data.message);
                }
                await refreshUser();
            }, 4000); // 4s animation

        } catch (error: any) {
            console.error("Spin error:", error);
            toast.error(error.message || "Failed to spin");
            setIsSpinning(false);
            toast.dismiss(toastId);
        }
    };

    return (
        <div className="space-y-8">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-purple-500/10 border-purple-500/20 text-purple-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2"
                >
                    <ShieldCheck className="h-3 w-3" />
                    Safe Sweepstakes Mode
                </motion.div>
                <h1 className="text-5xl md:text-7xl font-display font-black italic uppercase tracking-tight text-white text-center">
                    Neon <span className="text-purple-500 drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]">Wheel</span>
                </h1>
                <p className="text-white/40 text-sm md:text-base leading-relaxed uppercase tracking-widest font-medium text-center">
                    Spin for <span className="text-white font-bold">50 GC</span>. Win up to <span className="text-yellow-400 font-bold">10 SC</span> instantly.
                </p>
            </div>

            <div className="relative max-w-lg mx-auto">
                <div className="flex flex-col items-center justify-center gap-10">
                    <div className="relative">
                        {/* The Wheel */}
                        <motion.div
                            animate={{ rotate: rotation }}
                            transition={{ duration: 4, ease: [0.12, 0, 0.39, 0] }}
                            className="relative h-80 w-80 md:h-[400px] md:w-[400px] rounded-full border-8 border-white/5 bg-black overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.1)]"
                        >
                            {SEGMENTS.map((s, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1/2 bg-white/10 origin-bottom"
                                    style={{ transform: `rotate(${i * (360 / SEGMENTS.length)}deg)` }}
                                />
                            ))}

                            {SEGMENTS.map((s, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pt-6 origin-center h-full"
                                    style={{ transform: `translateX(-50%) rotate(${i * (360 / SEGMENTS.length) + (360 / SEGMENTS.length / 2)}deg)` }}
                                >
                                    <div className={cn("text-sm font-black uppercase tracking-tight", s.textColor)}>
                                        {s.label}
                                    </div>
                                </div>
                            ))}

                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_30%,black_100%)]" />
                        </motion.div>

                        {/* Pointer */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                            <div className="w-8 h-10 bg-purple-500 clip-path-polygon-[50%_100%,0_0,100%_0] shadow-[0_0_20px_rgba(168,85,247,1)]" />
                        </div>

                        {/* Center Hub */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="h-20 w-20 rounded-full bg-zinc-900 border-4 border-white/10 flex items-center justify-center shadow-2xl relative z-10">
                                <motion.div
                                    animate={{ rotate: isSpinning ? 360 : 0 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <Disc className={cn("h-8 w-8 text-purple-500")} />
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full space-y-6">
                        <AnimatePresence mode="wait">
                            {result ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "p-6 rounded-2xl border text-center space-y-2",
                                        result.prize.type !== 'none'
                                            ? "bg-purple-500/10 border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                                            : "bg-white/5 border-white/10"
                                    )}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Result</div>
                                    <div className="text-3xl font-black text-white">
                                        {result.message}
                                    </div>
                                    {result.prize.type !== 'none' && (
                                        <div className="text-sm font-medium text-emerald-400 mt-1">
                                            Balance Updated
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="p-6 rounded-2xl border border-white/5 bg-white/5 text-center h-[108px] flex items-center justify-center">
                                    <p className="text-white/30 text-xs uppercase tracking-widest">Ready to Spin</p>
                                </div>
                            )}
                        </AnimatePresence>

                        <div className="flex gap-4 items-center justify-center">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase text-white/40 tracking-wider">Cost</span>
                                <span className="text-xl font-bold text-white">50 GC</span>
                            </div>
                            <Button
                                onClick={spinWheel}
                                disabled={isSpinning}
                                className={cn(
                                    "h-16 px-12 text-xl font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95",
                                    isSpinning
                                        ? "bg-zinc-800 text-white/20 cursor-not-allowed"
                                        : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                                )}
                            >
                                {isSpinning ? "Spinning..." : "SPIN NOW"}
                            </Button>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] uppercase text-white/40 tracking-wider">Balance</span>
                                <span className="text-xl font-bold text-emerald-400">
                                    {(user?.credits || 0).toLocaleString()} GC
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
