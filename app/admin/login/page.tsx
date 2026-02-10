"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/components/providers/WalletProvider";
import { HybridAuth } from "@/components/auth/HybridAuth";
import { Button } from "@/components/ui/Button";
import { Wallet, ArrowLeft, Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, token, isLoading, connect, disconnect, refreshUser } = useWallet();
    const [showDenied, setShowDenied] = useState(false);

    const isAdmin = useMemo(
        () => user?.role === "admin" || user?.role === "superadmin",
        [user]
    );

    useEffect(() => {
        if (token && !user) {
            refreshUser();
        }
    }, [token, user, refreshUser]);

    useEffect(() => {
        const reason = searchParams.get("reason");
        if (reason === "unauthorized") setShowDenied(true);
    }, [searchParams]);

    useEffect(() => {
        if (isLoading) return;
        if (isAdmin) {
            router.push("/admin");
        } else if (token && user && !isAdmin) {
            setShowDenied(true);
        }
    }, [isLoading, isAdmin, token, user, router]);

    const handleWalletLogin = async () => {
        try {
            await connect("MetaMask");
        } catch (e: any) {
            toast.error(e?.message || "Wallet connection failed");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
            </div>

            <div className="absolute top-8 left-8 z-20">
                <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group">
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 text-center space-y-6 max-w-md w-full"
            >

                <div className="space-y-4">
                    <div className="inline-flex items-center justify-center mb-6 relative group cursor-pointer">
                        <Logo className="h-24 w-24 relative z-10" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-black text-white tracking-tight">
                        System Access
                    </h1>
                    <p className="text-muted-foreground text-lg italic">
                        Restricted environment. Authorized personnel only.
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {showDenied && (
                        <div className="mb-6 border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-4 py-3 rounded-xl flex items-center gap-3">
                            <Lock className="h-4 w-4 shrink-0" />
                            <span>Access denied. Admin privileges required.</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        <HybridAuth onAuthSuccess={() => refreshUser()} />

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/5"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-black/50 backdrop-blur-sm px-2 text-white/40">Or continue with wallet</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleWalletLogin}
                            className="w-full h-12 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-lg"
                        >
                            <Wallet className="h-5 w-5 mr-2" />
                            Connect Wallet
                        </Button>

                        {/* Logout Option for stuck sessions */}
                        {token && user && !isAdmin && (
                            <div className="pt-4 border-t border-white/5">
                                <button
                                    onClick={() => disconnect?.()}
                                    className="text-xs text-red-400 hover:text-red-300 hover:underline"
                                >
                                    Logout of current session
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-xs text-muted-foreground/60 pt-4 leading-relaxed">
                    Unauthorized access to this system is monitored <br />
                    and will be reported to the <span className="text-emerald-500 font-bold">Security Operations Center</span>.
                </p>
            </motion.div>
        </div>
    );
}
