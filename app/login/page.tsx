"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginChoicePage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/auth");
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 brightness-100 contrast-150" />
            </div>

            <div className="relative z-10 max-w-2xl w-full space-y-6 text-center">
                <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </Link>
                <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
                    Redirecting to Wallet Login...
                </h1>
                <p className="text-muted-foreground text-sm">
                    If you are not redirected, <Link href="/auth" className="text-primary font-bold">click here</Link>.
                </p>
                <p className="text-muted-foreground text-xs">
                    Admin access is available at <Link href="/admin/login" className="text-primary font-bold">/admin/login</Link>.
                </p>
            </div>
        </div>
    );
}
