"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminLoginError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Admin login route error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center space-y-6">
                <h2 className="text-2xl font-black">Something went wrong</h2>
                <p className="text-sm text-white/60">
                    Admin login encountered a temporary error. Try again or go back home.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => reset()}
                        className="h-10 px-5 rounded-xl bg-primary text-black font-bold hover:opacity-90 transition"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="h-10 px-5 rounded-xl border border-white/20 text-white/80 hover:text-white hover:border-white/40 inline-flex items-center transition"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
