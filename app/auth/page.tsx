"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Wallet, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { HybridAuth } from "@/components/auth/HybridAuth";

export default function AuthPage() {
    const { isConnected, token, user, connect, disconnect, refreshUser } = useWallet();
    const router = useRouter();
    const didRedirectRef = useRef(false);

    // Only redirect if user is already authenticated when page loads
    // Don't redirect during active sign-in process
    useEffect(() => {
        if (didRedirectRef.current) return;
        if (!token) return;

        // If token exists but user isn't loaded yet, refresh it once.
        if (!user) {
            refreshUser();
            return;
        }

        didRedirectRef.current = true;
        if (user?.role === "admin" || user?.role === "superadmin") {
            console.log("Admin authenticated, navigating to admin...");
            router.replace("/admin");
        } else {
            console.log("Authenticated, navigating to dashboard...");
            router.replace("/dashboard");
        }
    }, [token, user, refreshUser, router]);


    const handleWalletLogin = async () => {
        try {
            await connect("MetaMask");
            // refreshUser will be triggered by the effect in WalletProvider or we can call it manually if needed, 
            // but the effect above watches 'token' which should update upon connection/signing.
        } catch (e: any) {
            toast.error(e?.message || "Wallet connection failed");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
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
                        Access Protocol
                    </h1>
                    <p className="text-muted-foreground text-lg italic">
                        Initialize your identity to enter the TRK Ecosystem.
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="space-y-6">
                        <HybridAuth onAuthSuccess={() => router.push('/dashboard')} />

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
                            className="w-full h-12 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold text-lg"
                        >
                            <Wallet className="h-5 w-5 mr-2" />
                            Connect Wallet
                        </Button>

                        {/* Logout Option for stuck sessions */}
                        {token && (
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
                    By accessing the TRK Protocol, you acknowledge the <br />
                    <Link href="#" className="text-primary hover:underline font-bold">Risk Management Policy</Link>
                    {" "}&{" "}
                    <Link href="#" className="text-primary hover:underline font-bold">SLA</Link>.
                </p>
            </motion.div>
        </div>
    );
}
