"use client";

import { useEffect } from "react";
import { CopyX, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Optionally log the error to an error reporting service like Sentry
        console.error("Global React Boundary Caught:", error);
    }, [error]);

    return (
        <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-[#0a0a0a] to-black">
            <Card className="max-w-md w-full bg-zinc-950 border-red-900/50 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-amber-500" />
                <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                    <div className="h-16 w-16 bg-red-950 rounded-2xl border border-red-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.2)] mb-2">
                        <CopyX className="h-8 w-8 text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black uppercase tracking-tight font-display">Neural Interface Desync</h2>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            A critical client-side anomaly has been detected in the interface layer. System telemetry has logged the fault.
                        </p>
                    </div>

                    {process.env.NODE_ENV === "development" && (
                        <div className="w-full bg-black/50 border border-red-900/30 rounded-lg p-4 text-left overflow-x-auto text-[10px] font-mono text-red-400">
                            {error.message || "Unknown rendering exception"}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 w-full pt-4 border-t border-white/5">
                        <button
                            onClick={() => reset()}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold h-12 rounded-xl transition-all uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                        >
                            <RefreshCw className="h-4 w-4" /> REBOOT_SYSTEM
                        </button>
                        <Link
                            href="/"
                            className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-bold h-12 rounded-xl transition-all uppercase text-xs tracking-widest"
                        >
                            <Home className="h-4 w-4" /> CORE_HQ
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
