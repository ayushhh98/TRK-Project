"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/components/providers/WalletProvider";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { WalletConnectPanel } from "@/components/auth/WalletConnectPanel";

export default function AdminLoginPage() {
    const router = useRouter();
    const { user, token, isLoading, connect, disconnect, refreshUser } = useWallet();
    const [showDenied, setShowDenied] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const ADMIN_ROLES = ["admin", "superadmin", "finance_admin", "compliance_admin", "support_admin", "tech_admin"];
    const isAdmin = user?.role && ADMIN_ROLES.includes(user.role);
    const walletSnippet = user?.walletAddress
        ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
        : null;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (token && !user) {
            refreshUser();
        }
    }, [token, user, refreshUser]);

    useEffect(() => {
        if (!isMounted || typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const reason = params.get("reason");
        if (reason === "unauthorized") setShowDenied(true);
    }, [isMounted]);

    useEffect(() => {
        if (isLoading) return;
        if (isAdmin) {
            toast.success("Welcome back, Commander.");
            router.replace("/admin");
        } else if (token && user && !isAdmin) {
            setShowDenied(true);
        }
    }, [isLoading, isAdmin, token, user, router]);

    const statusSlot = showDenied ? (
        <div className="border border-red-500/40 bg-red-500/10 text-red-100 text-sm px-4 py-4 rounded-xl flex items-center gap-3">
            <Lock className="h-5 w-5 shrink-0 text-red-400" />
            <div className="flex flex-col text-left">
                <span className="font-bold text-red-300">Access Denied</span>
                <span className="text-xs opacity-80">
                    {walletSnippet ? `Wallet ${walletSnippet} is not authorized.` : "This wallet is not authorized."}
                </span>
            </div>
        </div>
    ) : isLoading ? (
        <div className="text-emerald-300 text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Verifying credentials...
        </div>
    ) : null;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
            </div>

            <div className="relative z-10 w-full max-w-5xl">
                <div className="text-center mb-6 space-y-2">
                    <div className="flex justify-center mb-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Home
                        </Link>
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.4em] text-white/30 font-black">
                        Admin Access
                    </p>
                    <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
                        Admin Login
                    </h1>
                    <p className="text-white/50 text-sm">
                        Connect your whitelisted wallet to access the admin panel.
                    </p>
                </div>

                <WalletConnectPanel
                    onConnect={connect}
                    isLoading={isLoading}
                    statusSlot={statusSlot}
                    closeHref="/"
                    qrPath="/admin/login?wallet=ready"
                />

                {token && user && !isAdmin && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => disconnect?.()}
                            className="text-xs text-red-400 hover:text-red-300 hover:underline"
                        >
                            Logout of current session
                        </button>
                    </div>
                )}

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
