"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Dices,
    Trophy,
    Gift,
    TrendingUp,
    ShieldCheck,
    Users,
    LogOut,
    Wallet,
    Menu,
    X,
    Cpu,
    Activity,
    ChevronRight,
    BarChart3,
    Crown
} from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/Logo";

const menuItems = [
    { name: "Terminal", icon: LayoutDashboard, href: "/dashboard", badge: "Live" },
    { name: "Liquidity Vault", icon: Wallet, href: "/dashboard/cash" },
    { name: "Membership", icon: Crown, href: "/membership", badge: "GC/SC" },
    { name: "Income Portfolio", icon: BarChart3, href: "/dashboard/income" },
    { name: "Yield Engine", icon: TrendingUp, href: "/dashboard/roi-on-roi" },
    { name: "Activation Node", icon: Cpu, href: "/dashboard/activation" },
    { name: "Jackpot Draw", icon: Gift, href: "/dashboard/lucky-draw", badge: "10 SC" },
    { name: "Elite Club", icon: Trophy, href: "/dashboard/club" },
    { name: "Growth Hub", icon: Users, href: "/dashboard/referral" },
    { name: "Protection", icon: ShieldCheck, href: "/dashboard/cashback", activeIndicator: true },
    { name: "Practice Arena", icon: Dices, href: "/dashboard/practice" },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { disconnect, address } = useWallet();
    const [isOpen, setIsOpen] = useState(false);

    const handleTerminate = async () => {
        try {
            await disconnect();
            router.push("/");
        } catch (error) {
            console.error("Logout failed:", error);
            // Fallback redirect even if disconnect fails
            router.push("/");
        }
    };

    return (
        <>
            {/* Mobile Toggle */}
            <button
                className="lg:hidden fixed top-6 right-6 z-[60] w-12 h-12 bg-primary flex items-center justify-center rounded-2xl text-black shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-transform active:scale-90"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 lg:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Main Sidebar */}
            <aside className={cn(
                "fixed left-0 top-0 h-full w-[248px] bg-[#050505]/80 backdrop-blur-3xl border-r border-white/5 z-50 transition-all duration-500 ease-in-out lg:translate-x-0 shadow-2xl",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />

                <div className="flex flex-col h-full relative z-10">
                    {/* Header: Logo */}
                    <div className="p-8 pb-10">
                        <Link href="/" className="group inline-block mb-10">
                            <Logo withText className="h-10 w-auto group-hover:scale-105 transition-transform duration-300" />
                        </Link>
                    </div>

                    {/* Menu Navigation */}
                    <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-8">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center justify-between px-5 py-3.5 rounded-2xl text-xs font-black transition-all duration-300 group relative overflow-hidden",
                                        isActive
                                            ? "bg-gradient-to-r from-primary/20 to-transparent text-primary border border-primary/20"
                                            : "text-zinc-500 hover:text-white hover:bg-white/[0.03] border border-transparent"
                                    )}
                                    onClick={() => setIsOpen(false)}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={cn(
                                            "p-2 rounded-xl transition-all duration-300",
                                            isActive ? "bg-primary text-black" : "bg-zinc-900 text-zinc-600 group-hover:text-primary group-hover:bg-primary/10"
                                        )}>
                                            <item.icon className="h-4.5 w-4.5" />
                                        </div>
                                        <span className="uppercase tracking-widest">{item.name}</span>
                                    </div>

                                    <div className="flex items-center gap-2 relative z-10">
                                        {item.badge && (
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[8px] font-mono tracking-tighter uppercase",
                                                isActive ? "bg-primary/20 text-primary" : "bg-white/5 text-zinc-600"
                                            )}>
                                                {item.badge}
                                            </span>
                                        )}
                                        {item.activeIndicator && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                                        )}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeChevron"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            >
                                                <ChevronRight className="h-3 w-3 text-primary" />
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Active Pulse Glow */}
                                    {isActive && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 0.15 }}
                                            className="absolute inset-0 bg-primary/20 blur-2xl"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-6 mt-auto border-t border-white/5 bg-black/40 backdrop-blur-3xl space-y-6">
                        <Button
                            variant="ghost"
                            className="w-full justify-between px-6 py-6 rounded-2xl text-red-500/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 group transition-all"
                            onClick={handleTerminate}
                        >
                            <div className="flex items-center gap-3">
                                <LogOut className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Terminate_Session</span>
                            </div>
                            <X className="h-3 w-3 opacity-30" />
                        </Button>
                    </div>
                </div >
            </aside >
        </>
    );
}
