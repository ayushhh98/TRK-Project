"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LogOut, ShieldCheck, Wallet, User as UserIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/components/providers/WalletProvider";
import { Logo } from "@/components/ui/Logo";
import { useRouter } from "next/navigation";

export function AdminNavbar() {
    const router = useRouter();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { isConnected, address, user, disconnect, connect } = useWallet();

    const displayName = user?.walletAddress
        ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
        : (user?.email || "Admin");

    const avatarChar = user?.walletAddress
        ? user.walletAddress.charAt(0).toUpperCase()
        : (user?.email?.charAt(0).toUpperCase() || "A");

    // Format address for display
    const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleTerminate = async () => {
        try {
            await disconnect();
            setIsProfileOpen(false);
            router.push("/admin/login");
        } catch (error) {
            console.error("Logout failed:", error);
            router.push("/admin/login");
        }
    };

    return (
        <nav className={`sticky top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled ? "py-4 bg-black/80 backdrop-blur-xl border-b border-white/5" : "py-6 bg-black"
            }`}>
            <div className="w-full px-6 md:px-10 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="group">
                        <Logo withText className="h-10 w-auto group-hover:scale-105 transition-transform duration-300" />
                    </Link>
                    <div className="h-6 w-px bg-white/10 hidden md:block" />
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase">
                        <ShieldCheck className="h-3 w-3" />
                        Admin Compliance Mode
                    </div>
                </div>

                {/* Desktop Actions */}
                <div className="flex items-center gap-4">
                    {isConnected && (
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-3 bg-[#0a0a0a] border border-white/5 hover:border-emerald-500/40 p-1.5 pr-5 rounded-2xl transition-all duration-500 group relative overflow-hidden"
                            >
                                {/* Animated Background Glow */}
                                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                {/* Identity Ring */}
                                <div className="relative h-10 w-10">
                                    <div className="absolute inset-0 rounded-xl border border-emerald-500/20" />
                                    <div className="absolute inset-1 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <span className="text-sm font-black text-emerald-500">
                                            {avatarChar}
                                        </span>
                                    </div>
                                </div>

                                {/* Text Info */}
                                <div className="flex flex-col items-start relative z-10">
                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">
                                        Administrator
                                    </span>
                                    <span className="text-xs font-black text-white group-hover:text-emerald-500 transition-colors tracking-tight leading-none">
                                        {displayName}
                                    </span>
                                </div>
                            </button>

                            <AnimatePresence>
                                {isProfileOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-4 w-72 bg-[#050505]/98 border border-white/5 rounded-[2rem] shadow-2xl backdrop-blur-3xl p-4 z-50 overflow-hidden ring-1 ring-white/5"
                                    >
                                        <div className="relative z-10 p-5 mb-2 rounded-[1.5rem] bg-white/[0.03] border border-white/5">
                                            <div className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] mb-2 flex justify-between items-center">
                                                <span>Session_ID</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-emerald-500/80">Secure</span>
                                                </div>
                                            </div>
                                            <div className="text-xs font-mono text-white/60 truncate">
                                                {user?.walletAddress || user?.email}
                                            </div>
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-2">
                                            <button
                                                onClick={handleTerminate}
                                                className="w-full h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/30 flex items-center justify-center gap-3 text-red-400 font-bold text-xs uppercase tracking-widest transition-all"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Terminate Session
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
