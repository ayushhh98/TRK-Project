"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Menu, X, ArrowRight, LayoutDashboard, LogOut, ShieldCheck, BarChart3, Users, Rocket, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/components/providers/WalletProvider";
import { Logo } from "@/components/ui/Logo";
import { useRouter } from "next/navigation";

const navLinks = [
    { name: "How it Works", href: "#how-it-works" },
    { name: "Incomes", href: "#incomes" },
    { name: "Safe & Secure", href: "#safety" },
];

export function Navbar() {
    const router = useRouter();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { isConnected, address, user, disconnect, connect } = useWallet();

    const displayName = user?.walletAddress
        ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
        : (user?.email || "Operator");

    const avatarChar = user?.walletAddress
        ? user.walletAddress.charAt(0).toUpperCase()
        : (user?.email?.charAt(0).toUpperCase() || "O");

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Format address for display
    const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

    const handleTerminate = async () => {
        try {
            await disconnect();
            setIsProfileOpen(false);
            setIsMobileMenuOpen(false);
            router.push("/");
        } catch (error) {
            console.error("Logout failed:", error);
            router.push("/");
        }
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled ? "py-4 bg-black/60 backdrop-blur-xl border-b border-white/5" : "py-6 bg-transparent"
            }`}>
            <div className="container mx-auto px-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="group">
                    <Logo withText className="h-10 w-auto group-hover:scale-105 transition-transform duration-300" />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-bold text-white/60 hover:text-primary transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-4">
                    {!isConnected ? (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" className="text-white hover:text-primary font-bold">
                                    Login
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button className="bg-primary text-black font-black px-6 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                                    Launch App
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard/practice">
                                <Button className="relative overflow-hidden bg-white/5 hover:bg-white/10 text-white font-bold px-8 rounded-full border border-white/10 hover:border-primary/50 transition-all duration-300 group/game shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                                    <span className="relative z-10 flex items-center gap-3">
                                        <span className="tracking-wide">GAME ZONE</span>
                                        <div className="bg-primary/20 p-1.5 rounded-full group-hover/game:bg-primary group-hover/game:text-black transition-colors duration-300">
                                            <Rocket className="h-4 w-4" />
                                        </div>
                                    </span>
                                    {/* Hover Gradient Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/game:translate-x-full transition-transform duration-1000 ease-in-out" />
                                </Button>
                            </Link>

                            <div className="relative">
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="flex items-center gap-3 bg-[#0a0a0a] border border-white/5 hover:border-primary/40 p-1.5 pr-5 rounded-2xl transition-all duration-500 group relative overflow-hidden"
                                >
                                    {/* Animated Background Glow */}
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    {/* Identity Ring */}
                                    <div className="relative h-10 w-10">
                                        {/* Outer Rotating Ring */}
                                        <div className="absolute inset-0 rounded-xl border border-primary/20 group-hover:rotate-45 transition-transform duration-700" />

                                        {/* Inner Glow Core */}
                                        <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-primary/20 to-yellow-500/10 border border-primary/30 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.1)] group-hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all duration-500">
                                            <span className="text-sm font-black text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]">
                                                {shortAddress.charAt(0)}
                                            </span>
                                        </div>

                                        {/* Scanning Line Effect */}
                                        <motion.div
                                            animate={{ top: ["0%", "100%", "0%"] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            className="absolute left-0 right-0 h-px bg-primary/40 blur-[1px] z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                                        />
                                    </div>

                                    {/* Text Info */}
                                    <div className="flex flex-col items-start relative z-10">
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">
                                            {user?.walletAddress ? "WEB3 AUTH" : "EMAIL AUTH"}
                                        </span>
                                        <span className="text-xs font-black text-white group-hover:text-primary transition-colors tracking-tight leading-none">
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
                                            className="absolute top-full right-0 mt-4 w-80 bg-[#050505]/98 border border-white/5 rounded-[2.5rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9)] backdrop-blur-3xl p-4 z-50 overflow-hidden ring-1 ring-white/5"
                                        >
                                            {/* Background Atmosphere */}
                                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

                                            {/* Header Identity Core */}
                                            <div className="relative z-10 p-5 mb-4 rounded-[1.5rem] bg-white/[0.03] border border-white/5 overflow-hidden group/header">
                                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/header:opacity-100 transition-opacity duration-700" />
                                                <div className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] mb-2 flex justify-between items-center">
                                                    <span>Identity_Node</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-emerald-500/80">Active</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                                                        {avatarChar}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-black text-white truncate font-mono tracking-tighter">
                                                            {user?.walletAddress || user?.email}
                                                        </div>
                                                        <div className="text-[10px] text-white/40 font-bold">
                                                            STATUS: {user?.walletAddress ? "WEB3_ENABLED" : "SANDBOX"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Menu Navigation */}
                                            <div className="space-y-2 relative z-10">
                                                <Link href="/dashboard" onClick={() => setIsProfileOpen(false)}>
                                                    <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.05] transition-all group/item outline-none group-active:scale-[0.98]">
                                                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover/item:border-primary/30 group-hover/item:text-primary transition-all">
                                                            <LayoutDashboard className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <div className="text-sm font-black text-white/80 group-hover/item:text-white transition-colors">Enterprise Terminal</div>
                                                            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Main_Dashboard</div>
                                                        </div>
                                                        <ArrowRight className="h-4 w-4 text-white/20 group-hover/item:translate-x-1 group-hover/item:text-primary transition-all" />
                                                    </button>
                                                </Link>

                                                <Link href="/dashboard/income" onClick={() => setIsProfileOpen(false)}>
                                                    <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.05] transition-all group/item outline-none group-active:scale-[0.98]">
                                                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover/item:border-primary/30 group-hover/item:text-primary transition-all">
                                                            <BarChart3 className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <div className="text-sm font-black text-white/80 group-hover/item:text-white transition-colors">Yield Intelligence</div>
                                                            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Income_Protocol</div>
                                                        </div>
                                                        <ArrowRight className="h-4 w-4 text-white/20 group-hover/item:translate-x-1 group-hover/item:text-primary transition-all" />
                                                    </button>
                                                </Link>

                                                <Link href="/dashboard/referral" onClick={() => setIsProfileOpen(false)}>
                                                    <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.05] transition-all group/item outline-none group-active:scale-[0.98]">
                                                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover/item:border-primary/30 group-hover/item:text-primary transition-all">
                                                            <Users className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <div className="text-sm font-black text-white/80 group-hover/item:text-white transition-colors">Social_Graph</div>
                                                            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Network_Expansion</div>
                                                        </div>
                                                        <ArrowRight className="h-4 w-4 text-white/20 group-hover/item:translate-x-1 group-hover/item:text-primary transition-all" />
                                                    </button>
                                                </Link>

                                                {/* Sequential Wallet Link Option */}
                                                {!address ? (
                                                    <button
                                                        onClick={() => { connect('MetaMask'); setIsProfileOpen(false); }}
                                                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-all group/item outline-none"
                                                    >
                                                        <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary transition-all">
                                                            <Wallet className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <div className="text-sm font-black text-primary">Connect Wallet</div>
                                                            <div className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">Enable_Web3</div>
                                                        </div>
                                                        <ArrowRight className="h-4 w-4 text-primary/40 group-hover/item:translate-x-1 transition-all" />
                                                    </button>
                                                ) : null}
                                            </div>

                                            {/* Security Footer */}
                                            <div className="mt-6 pt-4 border-t border-white/5 relative z-10 flex flex-col gap-3">
                                                <div className="flex items-center justify-between px-2">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Encrypted Session
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleTerminate}
                                                    className="w-full h-14 rounded-2xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 flex items-center justify-center gap-3 text-red-400 font-black text-sm uppercase tracking-widest transition-all group/logout"
                                                >
                                                    <LogOut className="h-4 w-4 group-hover/logout:-translate-x-1 transition-transform" />
                                                    Terminate Session
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-white"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-2xl border-b border-white/5 p-6 md:hidden"
                    >
                        <div className="flex flex-col gap-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="text-lg font-bold text-white"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-4 border-t border-white/10 flex flex-col gap-4">
                                {!isConnected ? (
                                    <>
                                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button variant="outline" className="w-full h-12 border-primary/20 text-primary font-bold">
                                                Login
                                            </Button>
                                        </Link>
                                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button className="w-full h-12 bg-primary text-black font-black">
                                                Launch App
                                            </Button>
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/dashboard/practice" onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button className="w-full h-12 bg-gradient-to-r from-primary to-yellow-500 text-black font-black rounded-xl">
                                                Go to Game Zone 🚀
                                            </Button>
                                        </Link>
                                        <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button variant="outline" className="w-full h-12 border-white/10 text-white font-bold">
                                                My Account Details
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            className="w-full h-12 text-red-400 font-bold"
                                            onClick={handleTerminate}
                                        >
                                            Logout
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
