"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { WalletConnectPanel } from "@/components/auth/WalletConnectPanel";

export default function AuthPage() {
    const { token, user, connect, refreshUser, isLoading } = useWallet();
    const router = useRouter();
    const didRedirectRef = useRef(false);

    // Redirect authenticated users
    useEffect(() => {
        if (didRedirectRef.current) return;
        if (!token) return;

        if (!user) {
            refreshUser();
            return;
        }

        if (user.role === "player" && !user.referredBy) {
            // Stay on auth until referral is completed.
            return;
        }

        didRedirectRef.current = true;

        // Redirect to home join gate after wallet login
        router.replace("/dashboard");
    }, [token, user, refreshUser, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 brightness-100 contrast-150" />
            </div>

            <div className="relative z-10 w-full max-w-5xl">
                <div className="text-center mb-6 space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.4em] text-white/30 font-black">
                        Secure Login
                    </p>
                    <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
                        Connect Wallet
                    </h1>
                    <p className="text-white/50 text-sm">
                        Connect your Web3 wallet to access the TRK ecosystem.
                    </p>
                </div>

                <WalletConnectPanel onConnect={connect} isLoading={isLoading} closeHref="/" qrPath="/auth?wallet=ready" />

                <div className="mt-6 text-center">
                    <Link
                        href="/admin/login"
                        className="text-xs text-white/40 hover:text-white/80 transition-colors underline underline-offset-4"
                    >
                        Admin Access
                    </Link>
                </div>

                <p className="text-center text-xs text-white/30 mt-6">
                    By connecting, you agree to our{" "}
                    <Link href="/terms" className="text-primary hover:underline">
                        Terms of Service
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
}
