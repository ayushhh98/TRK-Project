"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Wallet,
    Receipt,
    DollarSign,
    Gift,
    Crown,
    Gamepad2,
    BarChart3,
    ShieldAlert,
    FileText,
    Clock,
    Shield,
    Network,
    TrendingUp,
    History,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Activity,
    Zap,
    AlertTriangle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { useAdminSocket } from "@/hooks/useAdminSocket";

interface AdminSidebarProps {
    // These might be used if we stay with tab-based, but layout.tsx suggest route-based.
    // Keeping for compatibility if needed, but layout.tsx uses paths.
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

const menuGroups = [
    {
        label: "Core Protocol",
        items: [
            { id: "dashboard", label: "Overview", icon: LayoutDashboard, path: "/admin/dashboard", badge: "Live" },
            { id: "users", label: "Identity Hub", icon: Users, path: "/admin/users" },
            { id: "games", label: "Game Audit", icon: Gamepad2, path: "/admin/games", badge: "Live" },
            { id: "network", label: "Network Grid", icon: Network, path: "/admin/network" },
        ]
    },
    {
        label: "Finance Engine",
        items: [
            { id: "financials", label: "Treasury", icon: BarChart3, path: "/admin/financials" },
            { id: "economics", label: "Economics", icon: TrendingUp, path: "/admin/economics" },
            { id: "transactions", label: "Ledger", icon: History, path: "/admin/transactions", badge: "Live" },
            { id: "roi", label: "Yield Control", icon: Zap, path: "/admin/roi" },
            { id: "bd-wallet", label: "BD Wallet", icon: Wallet, path: "/admin/bd-wallet", badge: "Live" },
        ]
    },
    {
        label: "Ecosystem Mods",
        items: [
            { id: "jackpot", label: "Jackpot Host", icon: Gift, path: "/admin/jackpot", badge: "Live" },
            { id: "practice", label: "Sandbox", icon: Gamepad2, path: "/admin/practice" },
            { id: "club", label: "Elite Club", icon: Crown, path: "/admin/elite" },
        ]
    },
    {
        label: "Governance",
        items: [
            { id: "audit", label: "Audit Stream", icon: Clock, path: "/admin/audit" },
            { id: "team", label: "Team & Access", icon: Shield, path: "/admin/team" },
            { id: "legal", label: "Compliance", icon: FileText, path: "/admin/legal" },
            { id: "emergency", label: "Defcon 1", icon: AlertTriangle, path: "/admin/emergency", badge: "⚡" },
        ]
    }
];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { disconnect } = useWallet();
    const { connectionStatus } = useAdminSocket();
    const [isOpen, setIsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleTerminate = async () => {
        try {
            await disconnect();
            router.push("/admin/login");
        } catch (error) {
            console.error("Logout failed:", error);
            router.push("/admin/login");
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
                "fixed left-0 top-0 h-full w-[260px] bg-[#050505]/80 backdrop-blur-3xl border-r border-white/5 z-50 transition-all duration-500 ease-in-out lg:translate-x-0 shadow-2xl flex flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />

                <div className="flex flex-col h-full relative z-10">
                    {/* Header: Logo */}
                    <div className="p-8 pb-6">
                        <Link href="/admin" className="group inline-block mb-6">
                            <Logo withText className="h-10 w-auto group-hover:scale-105 transition-transform duration-300" />
                        </Link>
                        <div className="flex items-center gap-2 px-2">
                            <div className={cn(
                                "h-1.5 w-1.5 rounded-full animate-pulse",
                                connectionStatus === 'connected' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-zinc-600"
                            )} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 truncate">
                                {connectionStatus === 'connected' ? "System Link Active" : "Establishing Link..."}
                            </span>
                        </div>
                    </div>

                    {/* Menu Navigation */}
                    <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar pb-8 pt-4">
                        {menuGroups.map((group) => (
                            <div key={group.label} className="space-y-1">
                                <h3 className="px-5 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-3">
                                    {group.label}
                                </h3>
                                {group.items.map((item) => {
                                    const isActive = isMounted && (pathname === item.path || (onTabChange && activeTab === item.id));
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                if (onTabChange) {
                                                    onTabChange(item.id);
                                                } else {
                                                    router.push(item.path);
                                                }
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-5 py-3 rounded-2xl text-xs font-black transition-all duration-300 group relative overflow-hidden",
                                                isActive
                                                    ? "bg-gradient-to-r from-primary/20 to-transparent text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(var(--primary),0.05)]"
                                                    : "text-zinc-500 hover:text-white hover:bg-white/[0.03] border border-transparent"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={cn(
                                                    "p-2 rounded-xl transition-all duration-300",
                                                    isActive ? "bg-primary text-black" : "bg-zinc-900 text-zinc-600 group-hover:text-primary group-hover:bg-primary/10"
                                                )}>
                                                    <item.icon className="h-4 w-4" />
                                                </div>
                                                <span className="uppercase tracking-widest text-[11px]">{item.label}</span>
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
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="adminActiveChevron"
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
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>

                    <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-3xl space-y-4">
                        <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">Protocol Version</span>
                                <span className="text-[10px] font-mono text-primary/60">v1.4.2_LATEST</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary/40"
                                    animate={{
                                        width: connectionStatus === 'connected' ? '100%' : '30%',
                                        opacity: [0.4, 0.7, 0.4]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full justify-between px-6 py-6 rounded-2xl text-red-500/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 group transition-all"
                            onClick={handleTerminate}
                        >
                            <div className="flex items-center gap-3">
                                <LogOut className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Exit Access</span>
                            </div>
                            <Activity className="h-3 w-3 opacity-30" />
                        </Button>
                    </div>
                </div >
            </aside >
        </>
    );
}
