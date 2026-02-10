"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ShieldCheck, User } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/providers/WalletProvider";

export default function LoginChoicePage() {
    const router = useRouter();
    const { isConnected, isLoading, user } = useWallet();

    useEffect(() => {
        if (isLoading) return;
        if (!isConnected) return;
        if (user?.role === "admin" || user?.role === "superadmin") {
            router.push("/admin");
        } else {
            router.push("/dashboard");
        }
    }, [isLoading, isConnected, user, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden">
            {/* Background FX */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
            </div>

            <div className="relative z-10 max-w-2xl w-full space-y-8">
                <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </Link>

                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-24 h-24 relative group cursor-pointer">
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Logo className="h-25 w-25 relative z-10" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-black text-white tracking-tight">
                        Choose Login Portal
                    </h1>
                    <p className="text-muted-foreground">
                        Select your access type to continue.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* User Login */}
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                            <User className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">User Login</h2>
                            <p className="text-sm text-white/50">
                                Access your dashboard, games, and wallet features.
                            </p>
                        </div>
                        <Link href="/auth">
                            <Button className="w-full h-12 bg-emerald-500 text-black hover:bg-emerald-400 font-black uppercase tracking-widest text-xs">
                                Continue as User
                            </Button>
                        </Link>
                    </div>

                    {/* Admin Login */}
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Admin Login</h2>
                            <p className="text-sm text-white/50">
                                Restricted access for administrators only.
                            </p>
                        </div>
                        <Link href="/admin/login">
                            <Button className="w-full h-12 bg-amber-500 text-black hover:bg-amber-400 font-black uppercase tracking-widest text-xs">
                                Continue as Admin
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
