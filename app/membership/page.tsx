"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { packagesAPI } from "@/lib/api";
import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ShieldCheck, Crown, Zap, Wallet, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

type PackageKey = "starter" | "premium" | "vip";

type PackageData = {
    price: number;
    credits: number;
    bonus: number;
    rewardPoints: number;
    description: string;
    benefits: string[];
};

const packageMeta: Record<PackageKey, { title: string; accent: string; badge?: string; icon: any }> = {
    starter: { title: "Starter", accent: "emerald", icon: ShieldCheck },
    premium: { title: "Premium", accent: "amber", badge: "Best Value", icon: Zap },
    vip: { title: "VIP", accent: "purple", badge: "Elite", icon: Crown }
};

export default function MembershipPage() {
    const router = useRouter();
    const { isConnected, isLoading, user, address, purchaseMembership, refreshUser, connect, isWalletConnected } = useWallet();
    const [packages, setPackages] = useState<Record<string, PackageData> | null>(null);
    const [disclaimer, setDisclaimer] = useState("");
    const [buying, setBuying] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading) return;
        if (typeof window !== "undefined") {
            const hasToken = !!localStorage.getItem("trk_token");
            if (hasToken) return;
        }
        if (!isConnected) {
            router.push("/auth");
        }
    }, [isConnected, isLoading, router]);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await packagesAPI.getPackages();
                if (res.status !== "success") throw new Error(res.message || "Failed to load packages");
                setPackages(res.data?.packages || {});
                setDisclaimer(res.data?.disclaimer || "");
            } catch (err: any) {
                toast.error(err.message || "Failed to load membership packages");
            }
        };
        load();
    }, []);

    const handleBuy = async (key: PackageKey) => {
        if (!packages) return;
        if (!isWalletConnected) {
            toast.info("Connect your wallet to continue.");
            await connect("Other");
            return;
        }

        const pkg = packages[key];
        if (!pkg) return;

        setBuying(key);
        const toastId = toast.loading("Processing membership purchase...");

        try {
            await purchaseMembership(pkg.price, key);
            toast.success("Membership activated. Credits added.", { id: toastId });
            refreshUser();
        } catch (err: any) {
            toast.error(err.message || "Purchase failed", { id: toastId });
        } finally {
            setBuying(null);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="bg-transparent pb-32">
            <main className="container mx-auto px-4 py-8 space-y-10">
                {/* Hero Header Section */}
                <div className="relative rounded-[2.5rem] overflow-hidden bg-black border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.6)] group mb-10">
                    {/* Living Background Mesh */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.15),transparent_60%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_100%)] z-0" />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 p-10 md:p-12">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-purple-500/10 border-purple-500/20 text-purple-500 text-[10px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(168,85,247,0.1)] backdrop-blur-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                Premium Access
                            </div>
                            <h1 className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter drop-shadow-2xl">
                                MEMBERSHIP
                            </h1>
                            <p className="text-lg text-white/40 font-medium max-w-md leading-relaxed">
                                Unlock exclusive benefits and accelerate your earnings with premium membership packages.
                            </p>
                        </motion.div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 lg:gap-4">
                            <Link href="/free-credits">
                                <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 h-12 px-6 font-bold uppercase tracking-widest text-xs">
                                    Claim Free Credits
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Connected Status Bar */}
                    <div className="absolute bottom-0 inset-x-0 bg-white/5 border-t border-white/5 backdrop-blur-md px-10 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-20">
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                            <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Secure Payment Gateway Active</span>
                        </div>
                        {address && (
                            <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-white/40" />
                                <span className="text-xs font-mono font-medium text-white/50">
                                    {address.slice(0, 6)}...{address.slice(-4)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Disclaimer */}
                {disclaimer && (
                    <div className="border border-white/10 bg-white/5 backdrop-blur-sm p-4 rounded-2xl text-xs text-white/60">
                        {disclaimer}
                    </div>
                )}

                {/* Package Cards Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid md:grid-cols-3 gap-6"
                >
                    {(Object.keys(packageMeta) as PackageKey[]).map((key) => {
                        const meta = packageMeta[key];
                        const pkg = packages?.[key];
                        return (
                            <motion.div key={key} variants={itemVariants}>
                                <Card
                                    className={cn(
                                        "bg-black/40 border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden group transition-all duration-500 hover:shadow-[0_0_50px_rgba(0,0,0,0.3)] relative h-full",
                                        meta.accent === "emerald" && "hover:border-emerald-500/50 hover:shadow-[0_0_50px_rgba(16,185,129,0.15)]",
                                        meta.accent === "amber" && "hover:border-amber-500/50 hover:shadow-[0_0_50px_rgba(245,158,11,0.15)]",
                                        meta.accent === "purple" && "hover:border-purple-500/50 hover:shadow-[0_0_50px_rgba(168,85,247,0.15)]"
                                    )}
                                >
                                    {/* Gradient Overlay on Hover */}
                                    <div className={cn(
                                        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                        meta.accent === "emerald" && "bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent",
                                        meta.accent === "amber" && "bg-gradient-to-br from-amber-500/5 via-transparent to-transparent",
                                        meta.accent === "purple" && "bg-gradient-to-br from-purple-500/5 via-transparent to-transparent"
                                    )} />

                                    <CardContent className="p-8 space-y-6 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-14 w-14 rounded-2xl flex items-center justify-center border group-hover:scale-110 transition-transform duration-300",
                                                    meta.accent === "emerald" && "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-black shadow-[0_0_30px_rgba(16,185,129,0.2)]",
                                                    meta.accent === "amber" && "border-amber-500/30 text-amber-400 bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-black shadow-[0_0_30px_rgba(245,158,11,0.2)]",
                                                    meta.accent === "purple" && "border-purple-500/30 text-purple-400 bg-purple-500/10 group-hover:bg-purple-500 group-hover:text-black shadow-[0_0_30px_rgba(168,85,247,0.2)]"
                                                )}>
                                                    <meta.icon className="h-7 w-7" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black uppercase tracking-widest text-white/60">{meta.title}</div>
                                                    <div className="text-2xl font-black text-white">{pkg ? `${pkg.price} USDT` : "--"}</div>
                                                </div>
                                            </div>
                                            {meta.badge && (
                                                <div className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border",
                                                    meta.accent === "emerald" && "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
                                                    meta.accent === "amber" && "border-amber-500/30 text-amber-400 bg-amber-500/10",
                                                    meta.accent === "purple" && "border-purple-500/30 text-purple-400 bg-purple-500/10"
                                                )}>
                                                    {meta.badge}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 text-sm text-white/70 pt-4 border-t border-white/5">
                                            <div className="flex justify-between">
                                                <span>GC Credits:</span>
                                                <span className="text-white font-bold">{pkg?.credits ?? "--"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Bonus GC:</span>
                                                <span className="text-white font-bold">{pkg?.bonus ?? "--"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Reward Points:</span>
                                                <span className="text-white font-bold">{pkg?.rewardPoints ?? "--"}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-xs text-white/50 pt-4 border-t border-white/5">
                                            {(pkg?.benefits || []).map((b) => (
                                                <div key={b} className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "h-1.5 w-1.5 rounded-full",
                                                        meta.accent === "emerald" && "bg-emerald-500",
                                                        meta.accent === "amber" && "bg-amber-500",
                                                        meta.accent === "purple" && "bg-purple-500"
                                                    )} />
                                                    {b}
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            disabled={!pkg || !!buying}
                                            onClick={() => handleBuy(key)}
                                            className={cn(
                                                "w-full h-12 font-black uppercase tracking-widest text-xs transition-all group-hover:scale-105",
                                                meta.accent === "emerald" && "bg-emerald-500 text-black hover:bg-emerald-400",
                                                meta.accent === "amber" && "bg-amber-500 text-black hover:bg-amber-400",
                                                meta.accent === "purple" && "bg-purple-500 text-black hover:bg-purple-400"
                                            )}
                                        >
                                            {buying === key ? "Processing..." : "Buy With Wallet"}
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>

                                        {!isWalletConnected && (
                                            <div className="text-[10px] text-white/40 text-center">
                                                Click “Buy With Wallet” to connect.
                                            </div>
                                        )}
                                    </CardContent>

                                    {/* Scanline Decoration */}
                                    <div className={cn(
                                        "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                        meta.accent === "emerald" && "via-emerald-500/50",
                                        meta.accent === "amber" && "via-amber-500/50",
                                        meta.accent === "purple" && "via-purple-500/50"
                                    )} />
                                </Card>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Footer Info */}
                <div className="flex items-center justify-between border border-white/10 bg-white/5 backdrop-blur-sm p-4 rounded-2xl text-xs text-white/50">
                    <span>No purchase necessary. You can claim daily free credits.</span>
                    <Link href="/free-credits" className="text-white/70 hover:text-white font-bold uppercase tracking-wider transition-colors">
                        Go to Free Credits →
                    </Link>
                </div>
            </main>
        </div>
    );
}
